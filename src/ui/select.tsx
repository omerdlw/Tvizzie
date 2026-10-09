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
} from "react";
import { createPortal } from "react-dom";
import {
  useControllableState,
  useEscapeKey,
} from "@omerdlw/base-framework/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { Icon } from "./icon";
import { resolveSlotClasses } from "./utils";
import { SelectClassNames, SelectOption, SelectProps } from "./types";

const noSubscribe = () => () => {};
const readHost = () => document.body;
const noHost = () => null;

const canAnchor = () => CSS.supports("anchor-name", "--a");
const cannotAnchor = () => false;

interface Anchor {
  edge: number;
  left: number;
  maxHeight: number;
  up: boolean;
  width: number;
}

const MENU_MAX = 256;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 12;

const COMPACT = {
  content: "rounded-[16px] p-1",
  option: "rounded-[11px] px-2.5 py-1.5 text-xs",
  trigger: "h-8 rounded-[13px] px-3 py-0 text-xs",
} as const;

function Select<T extends string = string>({
  ariaLabel,
  className,
  classNames,
  defaultOpen = false,
  defaultValue,
  disabled = false,
  emptyMessage = "No options available",
  id,
  label,
  name,
  onChange,
  onOpenChange,
  open: openProp,
  options,
  placeholder = "Select an option...",
  placement = "popover",
  size = "md",
  value: valueProp,
}: SelectProps<T>) {
  const generatedId = useId();
  const triggerId = id || `select-trigger-${generatedId}`;
  const listboxId = `select-listbox-${generatedId}`;
  const theme = useTheme(primitivesTheme);
  const classes = resolveSlotClasses<SelectClassNames>(className, classNames);
  const compact = size === "sm";

  const [selectedValue, setSelectedValue] = useControllableState<T | undefined>(
    {
      defaultValue,
      value: valueProp,
    },
  );

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    value: openProp,
  });

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
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
    () => options.find((opt) => opt.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  const enabledIndices = useMemo(
    () =>
      options
        .map((opt, idx) => (opt.disabled ? -1 : idx))
        .filter((idx) => idx !== -1),
    [options],
  );

  const closeSelect = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  useEscapeKey(() => {
    if (isOpen) {
      closeSelect();
      triggerRef.current?.focus();
    }
  }, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeSelect();
      }
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
    };
  }, [closeSelect, isOpen]);

  useEffect(() => {
    if (!isOpen || placement !== "popover" || anchored) return;
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [anchored, isOpen, place, placement]);

  const handleSelectOption = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled || disabled) return;
      setSelectedValue(option.value);
      onChange?.(option.value, option);
      closeSelect();
      triggerRef.current?.focus();
    },
    [closeSelect, disabled, onChange, setSelectedValue],
  );

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!isOpen) {
          place();
          setIsOpen(true);
          const currentSelectedIdx = options.findIndex(
            (o) => o.value === selectedValue && !o.disabled,
          );
          setHighlightedIndex(
            currentSelectedIdx >= 0
              ? currentSelectedIdx
              : (enabledIndices[0] ?? -1),
          );
          return;
        }

        if (enabledIndices.length === 0) return;
        const currentPos = enabledIndices.indexOf(highlightedIndex);
        if (event.key === "ArrowDown") {
          const nextPos =
            currentPos < 0 || currentPos >= enabledIndices.length - 1
              ? 0
              : currentPos + 1;
          setHighlightedIndex(enabledIndices[nextPos]);
        } else {
          const prevPos =
            currentPos <= 0 ? enabledIndices.length - 1 : currentPos - 1;
          setHighlightedIndex(enabledIndices[prevPos]);
        }
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (isOpen) {
          const candidate = options[highlightedIndex];
          if (candidate && !candidate.disabled) {
            handleSelectOption(candidate);
          } else {
            closeSelect();
          }
        } else {
          place();
          setIsOpen(true);
          const currentSelectedIdx = options.findIndex(
            (o) => o.value === selectedValue && !o.disabled,
          );
          setHighlightedIndex(
            currentSelectedIdx >= 0
              ? currentSelectedIdx
              : (enabledIndices[0] ?? -1),
          );
        }
      }
    },
    [
      closeSelect,
      disabled,
      enabledIndices,
      handleSelectOption,
      highlightedIndex,
      isOpen,
      options,
      place,
      selectedValue,
      setIsOpen,
    ],
  );

  const rise = floating && anchor.up ? -1 : 1;

  const menu = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.97,
            transition: { duration: 0.18, ease: [0.65, 0, 0.35, 1] },
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
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            theme.slots.selectContent,
            compact && COMPACT.content,
            classes.content,
          )}
        >
          {options.length === 0 ? (
            <div className={cn(theme.slots.selectEmpty, classes.empty)}>
              {emptyMessage}
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isHighlighted = index === highlightedIndex;
              return (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  initial={{ opacity: 0, x: -8 }}
                  key={option.value}
                  role="option"
                  transition={{
                    delay: 0.05 + Math.min(index, 8) * 0.03,
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  data-highlighted={isHighlighted || undefined}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightedIndex(index);
                  }}
                  onClick={() => handleSelectOption(option)}
                  className={cn(
                    theme.slots.selectOption,
                    compact && COMPACT.option,
                    isHighlighted && classes.optionActive,
                    isSelected && classes.optionSelected,
                    classes.option,
                  )}
                >
                  <span className={theme.slots.selectOptionContent}>
                    {option.icon ? (
                      <Icon
                        icon={option.icon}
                        size={16}
                        className={cn(
                          theme.slots.selectIcon,
                          classes.optionIcon,
                        )}
                      />
                    ) : null}
                    <span className={theme.slots.selectOptionBody}>
                      <span
                        className={cn(
                          theme.slots.selectText,
                          classes.optionLabel,
                        )}
                      >
                        {option.label}
                      </span>
                      {option.description ? (
                        <span
                          className={cn(
                            theme.slots.selectOptionDescription,
                            classes.optionDescription,
                          )}
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {isSelected ? (
                    <Icon
                      icon="solar:check-read-linear"
                      size={16}
                      className={theme.slots.selectCheck}
                    />
                  ) : null}
                </motion.div>
              );
            })
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      className={cn(theme.slots.selectRoot, classes.root, classes.default)}
    >
      {label ? (
        <label
          htmlFor={triggerId}
          className={cn(theme.slots.selectLabel, classes.label)}
        >
          {label}
        </label>
      ) : null}

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
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          const nextOpen = !isOpen;
          if (nextOpen) place();
          setIsOpen(nextOpen);
          if (nextOpen) {
            const currentSelectedIdx = options.findIndex(
              (o) => o.value === selectedValue && !o.disabled,
            );
            setHighlightedIndex(
              currentSelectedIdx >= 0
                ? currentSelectedIdx
                : (enabledIndices[0] ?? -1),
            );
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          theme.slots.selectTrigger,
          compact && COMPACT.trigger,
          classes.trigger,
        )}
      >
        <span className={theme.slots.selectTriggerContent}>
          {selectedOption?.icon ? (
            <Icon
              icon={selectedOption.icon}
              size={16}
              className={cn(theme.slots.selectIcon, classes.optionIcon)}
            />
          ) : null}
          {selectedOption ? (
            <span className={cn(theme.slots.selectText, classes.value)}>
              {selectedOption.label}
            </span>
          ) : (
            <span
              className={cn(theme.slots.selectPlaceholder, classes.placeholder)}
            >
              {placeholder}
            </span>
          )}
        </span>

        <Icon
          icon="solar:alt-arrow-down-linear"
          size={16}
          className={cn(theme.slots.selectChevron, classes.chevron)}
        />
      </button>

      {floating ? createPortal(menu, host) : menu}
    </div>
  );
}

Select.displayName = "Select";
export { Select };
