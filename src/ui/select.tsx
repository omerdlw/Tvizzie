"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
} from "motion/react";
import {
  useControllableState,
  useEscapeKey,
} from "@omerdlw/base-framework/hooks";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { Icon } from "./icon";
import { primitivesTheme } from "./theme";
import { SlidingHighlight } from "./sliding-highlight";
import { EASE } from "@/motion/stage/tempo";

interface SelectOption<T extends string = string> {
  description?: ReactNode;
  disabled?: boolean;
  icon?: string;
  label: ReactNode;
  value: T;
}

export interface SelectClassNames {
  content?: string;
  option?: string;
  root?: string;
  trigger?: string;
}

interface SelectProps<T extends string = string> {
  ariaLabel?: string;
  className?: string;
  classNames?: SelectClassNames;
  name?: string;
  onChange?: (value: T, option: SelectOption<T>) => void;
  options: readonly SelectOption<T>[];
  placement?: "inline" | "popover";
  size?: "md" | "sm";
  value?: T;
}

interface Anchor {
  edge: number;
  left: number;
  maxHeight: number;
  up: boolean;
  width: number;
}

const noSubscribe = () => () => {};
const readHost = () => document.body;
const noHost = () => null;
const canAnchor = () => CSS.supports("anchor-name", "--a");
const cannotAnchor = () => false;

const MENU_MAX = 256;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 12;

const COMPACT = {
  content: "p-1",
  option: "px-2.5 py-1.5 text-xs",
  trigger: "h-8 px-3 py-0 text-xs",
} as const;

export function Select<T extends string = string>({
  ariaLabel,
  className,
  classNames = {},
  name,
  onChange,
  options,
  placement = "popover",
  size = "md",
  value: valueProp,
}: SelectProps<T>) {
  const generatedId = useId();
  const listboxId = `select-listbox-${generatedId}`;
  const theme = useTheme(primitivesTheme);
  const compact = size === "sm";

  const [selectedValue, setSelectedValue] = useControllableState<T | undefined>(
    {
      defaultValue: undefined,
      value: valueProp,
    },
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const host = useSyncExternalStore(noSubscribe, readHost, noHost);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const floating = placement === "popover" && host !== null && anchor !== null;
  const anchored = useSyncExternalStore(noSubscribe, canAnchor, cannotAnchor);
  const anchorName = `--select-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const place = useCallback(() => {
    const box = triggerRef.current?.getBoundingClientRect();
    if (!box) return;
    const wanted = Math.min(
      MENU_MAX,
      options.length * (compact ? 30 : 38) + 12,
    );
    const below = window.innerHeight - box.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const above = box.top - MENU_GAP - VIEWPORT_MARGIN;
    const up = wanted > below && above > below;
    setAnchor({
      edge: up ? window.innerHeight - box.top : box.bottom,
      left: box.left,
      maxHeight: Math.max(96, Math.min(MENU_MAX, up ? above : below)),
      up,
      width: box.width,
    });
  }, [compact, options.length]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  const enabledIndices = useMemo(
    () => options.flatMap((option, index) => (option.disabled ? [] : [index])),
    [options],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const open = useCallback(() => {
    place();
    setIsOpen(true);
    const selected = options.findIndex(
      (option) => option.value === selectedValue && !option.disabled,
    );
    setHighlightedIndex(selected >= 0 ? selected : (enabledIndices[0] ?? -1));
  }, [enabledIndices, options, place, selectedValue]);

  useEscapeKey(() => {
    if (!isOpen) return;
    close();
    triggerRef.current?.focus();
  }, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    return () =>
      document.removeEventListener("mousedown", handlePointerDownOutside);
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen || placement !== "popover" || anchored) return;
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [anchored, isOpen, place, placement]);

  useEffect(() => {
    if (!isOpen || placement !== "popover") return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = menuRef.current;
      if (!box?.contains(event.target as Node)) return;
      const step = event.deltaMode === 1 ? 16 : 1;
      box.scrollTop += event.deltaY * step;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        event.preventDefault();
      }
    };
    const listener = { capture: true, passive: false } as const;
    window.addEventListener("wheel", onWheel, listener);
    window.addEventListener("touchmove", onTouchMove, listener);
    return () => {
      window.removeEventListener("wheel", onWheel, listener);
      window.removeEventListener("touchmove", onTouchMove, listener);
    };
  }, [isOpen, placement]);

  const choose = (option: SelectOption<T>) => {
    if (option.disabled) return;
    setSelectedValue(option.value);
    onChange?.(option.value, option);
    close();
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      if (enabledIndices.length === 0) return;
      const at = enabledIndices.indexOf(highlightedIndex);
      const last = enabledIndices.length - 1;
      const next =
        event.key === "ArrowDown"
          ? at < 0 || at >= last
            ? 0
            : at + 1
          : at <= 0
            ? last
            : at - 1;
      setHighlightedIndex(enabledIndices[next]);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      const candidate = options[highlightedIndex];
      if (candidate && !candidate.disabled) choose(candidate);
      else close();
    }
  };

  const rise = floating && anchor.up ? -1 : 1;

  const menu = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.97,
            transition: { duration: 0.18, ease: EASE.glide },
            y: rise * -6,
          }}
          id={listboxId}
          initial={{ opacity: 0, scale: 0.96, y: rise * -8 }}
          key="listbox"
          ref={menuRef}
          role="listbox"
          data-cinematic={floating ? "" : undefined}
          style={{
            ...theme.styles.selectContent,
            ...(floating && anchored
              ? ({
                  left: "anchor(left)",
                  marginTop: MENU_GAP,
                  position: "fixed",
                  positionAnchor: anchorName,
                  positionTryFallbacks: "flip-block",
                  top: "anchor(bottom)",
                  width: "anchor-size(width)",
                } as CSSProperties)
              : floating
                ? {
                    left: anchor.left,
                    marginBottom: anchor.up ? MENU_GAP : 0,
                    marginTop: anchor.up ? 0 : MENU_GAP,
                    maxHeight: anchor.maxHeight,
                    position: "fixed",
                    width: anchor.width,
                    ...(anchor.up
                      ? { bottom: anchor.edge, top: "auto" }
                      : { top: anchor.edge }),
                  }
                : null),
            transformOrigin: floating && anchor.up ? "bottom" : "top",
          }}
          transition={{ duration: 0.45, ease: EASE.expo }}
          className={cn(
            theme.slots.selectContent,
            compact && COMPACT.content,
            classNames.content,
          )}
        >
          {options.length === 0 ? (
            <div className={theme.slots.selectEmpty}>No options available</div>
          ) : (
            <LayoutGroup id={`select-options-${generatedId}`}>
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                const isHighlighted =
                  index === highlightedIndex && !option.disabled;
                return (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    initial={{ opacity: 0, x: -8 }}
                    key={option.value}
                    role="option"
                    transition={{
                      delay: 0.05 + Math.min(index, 8) * 0.03,
                      duration: 0.4,
                      ease: EASE.expo,
                    }}
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-highlighted={isHighlighted || undefined}
                    onMouseEnter={() => {
                      if (!option.disabled) setHighlightedIndex(index);
                    }}
                    onClick={() => choose(option)}
                    className={cn(
                      "relative isolate",
                      theme.slots.selectOption,
                      compact && COMPACT.option,
                      classNames.option,
                    )}
                  >
                    {isHighlighted ? (
                      <SlidingHighlight
                        className="rounded-full bg-white/10"
                        layoutId="select-option-highlight"
                      />
                    ) : null}
                    <span className="relative z-10 flex min-w-0 items-center gap-2.5">
                      {option.icon ? (
                        <Icon
                          icon={option.icon}
                          size={16}
                          className={theme.slots.selectIcon}
                        />
                      ) : null}
                      <span className={theme.slots.selectOptionBody}>
                        <span className={theme.slots.selectText}>
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className={theme.slots.selectOptionDescription}>
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {isSelected ? (
                      <Icon
                        icon="solar:check-read-linear"
                        size={16}
                        className={cn(theme.slots.selectCheck, "relative z-10")}
                      />
                    ) : null}
                  </motion.div>
                );
              })}
            </LayoutGroup>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      className={cn(theme.slots.selectRoot, classNames.root, className)}
    >
      {name ? (
        <input type="hidden" name={name} value={selectedValue ?? ""} />
      ) : null}

      <button
        ref={triggerRef}
        style={
          anchored && placement === "popover"
            ? ({ anchorName } as CSSProperties)
            : undefined
        }
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          theme.slots.selectTrigger,
          compact && COMPACT.trigger,
          classNames.trigger,
        )}
      >
        <span className={theme.slots.selectTriggerContent}>
          {selectedOption?.icon ? (
            <Icon
              icon={selectedOption.icon}
              size={16}
              className={theme.slots.selectIcon}
            />
          ) : null}
          {selectedOption ? (
            <span className={theme.slots.selectText}>
              {selectedOption.label}
            </span>
          ) : (
            <span className={theme.slots.selectPlaceholder}>
              Select an option...
            </span>
          )}
        </span>
        <Icon
          icon="solar:alt-arrow-down-linear"
          size={16}
          className={theme.slots.selectChevron}
        />
      </button>

      {floating ? createPortal(menu, host) : menu}
    </div>
  );
}
