"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type JSX,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePage } from "@omerdlw/base-framework/kernel";
import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon, Input, Select } from "@/ui";
import { useAccountDockFilterAction } from "../account-dock";

interface FilterField {
  allLabel?: string;
  key: string;
  options: readonly { label: string; value: string }[];
  defaultValue?: string;
}

const ANY = "__any__";

// Typing settles for this long before the address follows it.
const SEARCH_SETTLE_MS = 280;

const LOOKS = {
  inline: {
    form: "relative min-w-[12rem] flex-1 sm:max-w-xs",
    input:
      "h-10 w-full rounded-control bg-white/5 pr-3 pl-10 text-sm text-white ring-1 ring-white/5 ring-inset placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:outline-none",
    reset:
      "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-control px-3 text-xs font-semibold text-white/60 uppercase hover:bg-white/10 hover:text-white",
    root: "mb-5 flex flex-wrap items-center gap-2",
    select: "min-w-0 flex-1 basis-[8.5rem] sm:w-44 sm:flex-none",
    trigger: undefined,
  },
  // Beside the dock, the filters stand on the dock's own glass, as tall as
  // its buttons and on the same floor as it.
  rail: {
    form: "relative max-w-full",
    input:
      "h-10 w-52 max-w-full rounded-plate bg-black/60 pr-4 pl-10 text-sm text-white ring-1 ring-white/10 backdrop-blur-lg ring-inset placeholder:text-white/40 hover:bg-black/70 focus:bg-black/70 focus:outline-none",
    reset: "",
    root: "flex flex-col justify-end gap-1.5",
    select: "w-52 max-w-full",
    trigger:
      "h-10 rounded-plate bg-black/60 px-4 py-0 text-sm ring-white/10 backdrop-blur-lg hover:bg-black/70 aria-expanded:bg-black/70",
  },
} as const;

interface FilterProps {
  fields: readonly FilterField[];
  searchPlaceholder: string | null;
}

function useFilterAddress(fields: readonly FilterField[]) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const query = search.get("q") ?? "";

  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      const next = params.toString();
      startTransition(() =>
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        }),
      );
    },
    [pathname, router, search],
  );

  const isFiltered =
    Boolean(query) ||
    fields.some((field) => {
      const value = search.get(field.key);
      return Boolean(value) && value !== (field.defaultValue ?? "");
    });

  const reset = useCallback(
    () =>
      apply({
        q: null,
        ...Object.fromEntries(fields.map((field) => [field.key, null])),
      }),
    [apply, fields],
  );

  return { apply, isFiltered, pending, query, reset, search };
}

// One set of filter controls. Each set keeps its own search text and reads
// everything else from the address, so the sets beside the dock and the one
// on the page never disagree.
function FilterControls({
  className,
  fields,
  look: name,
  part = "all",
  searchPlaceholder,
  showReset,
}: FilterProps & {
  className?: string;
  look: keyof typeof LOOKS;
  part?: "all" | "first" | "rest";
  showReset: boolean;
}): JSX.Element {
  const look = LOOKS[name];
  const { apply, isFiltered, pending, query, reset, search } =
    useFilterAddress(fields);
  const [text, setText] = useState(query);
  // The last search this set sent: when the address catches up with it, the
  // field is not rewound under the words typed since.
  const [sent, setSent] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);

  if (query !== seenQuery) {
    setSeenQuery(query);
    if (query !== sent) {
      setSent(query);
      setText(query);
    }
  }

  const sendQuery = useCallback(
    (value: string) => {
      setSent(value);
      apply({ q: value || null });
    },
    [apply],
  );

  useEffect(() => {
    const next = text.trim();
    if (next === sent) return;
    const timer = setTimeout(() => sendQuery(next), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [sendQuery, sent, text]);

  const items: JSX.Element[] = [];
  if (searchPlaceholder) {
    items.push(
      <form
        className={look.form}
        key="q"
        onSubmit={(event) => {
          event.preventDefault();
          const next = text.trim();
          if (next !== sent) sendQuery(next);
        }}
        role="search"
      >
        <Input
          aria-label={searchPlaceholder}
          className={look.input}
          maxLength={80}
          onChange={(event) => setText(event.target.value)}
          placeholder={searchPlaceholder}
          value={text}
        />
        {/* After the field: its glass would otherwise be laid over it. */}
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white/50"
          icon={
            pending && text.trim()
              ? "svg-spinners:90-ring-with-bg"
              : "solar:magnifer-linear"
          }
          size={15}
        />
      </form>,
    );
  }
  for (const field of fields) {
    const current = search.get(field.key) ?? field.defaultValue ?? ANY;
    const options = field.allLabel
      ? [{ label: field.allLabel, value: ANY }, ...field.options]
      : field.options;
    items.push(
      <Select
        ariaLabel={field.allLabel ?? field.key}
        className={look.select}
        classNames={look.trigger ? { trigger: look.trigger } : undefined}
        key={field.key}
        onChange={(value) =>
          apply({
            [field.key]:
              value === ANY || value === (field.defaultValue ?? "")
                ? null
                : value,
          })
        }
        options={options}
        value={
          options.some((option) => option.value === current) ? current : ANY
        }
      />,
    );
  }

  const half = Math.ceil(items.length / 2);
  const shown =
    part === "first"
      ? items.slice(0, half)
      : part === "rest"
        ? items.slice(half)
        : items;

  return (
    <div className={cn(look.root, className)}>
      {shown}
      {showReset && isFiltered ? (
        <Button className={look.reset} onClick={reset}>
          <Icon icon="solar:close-circle-linear" size={14} />
          Reset
        </Button>
      ) : null}
    </div>
  );
}

// Clearing the filters is the dock's action, so the controls either side of
// it stay as many on the one side as on the other.
function ResetAction({ onReset }: { onReset: () => void }): JSX.Element {
  const actionClass = useDockActionClass();
  return (
    <Button
      aria-label="Reset filters"
      className={actionClass({ className: "px-4 backdrop-blur-sm" })}
      onClick={onReset}
      type="button"
    >
      <Icon icon="solar:restart-linear" size={15} />
      <span className="truncate">Reset</span>
    </Button>
  );
}

export function FilterBar({
  docked = false,
  fields,
  searchPlaceholder = "Search",
}: {
  // On wide screens, set the filters beside the dock instead of on the page.
  docked?: boolean;
  fields: readonly FilterField[];
  searchPlaceholder?: string | null;
}): JSX.Element {
  const { isFiltered, reset } = useFilterAddress(fields);
  const resetAction = useMemo(
    () => (docked && isFiltered ? <ResetAction onReset={reset} /> : null),
    [docked, isFiltered, reset],
  );
  const resetInDock = useAccountDockFilterAction(resetAction) && docked;

  const page = useMemo(
    () =>
      docked
        ? {
            controls: {
              id: "filters",
              left: (
                <FilterControls
                  className="items-end"
                  fields={fields}
                  look="rail"
                  part="first"
                  searchPlaceholder={searchPlaceholder}
                  showReset={false}
                />
              ),
              right: (
                <FilterControls
                  className="items-start"
                  fields={fields}
                  look="rail"
                  part="rest"
                  searchPlaceholder={searchPlaceholder}
                  showReset={false}
                />
              ),
            },
          }
        : {},
    [docked, fields, searchPlaceholder],
  );
  usePage(page);

  return (
    <FilterControls
      className={docked ? "lg:hidden" : undefined}
      fields={fields}
      look="inline"
      searchPlaceholder={searchPlaceholder}
      showReset={!resetInDock}
    />
  );
}
