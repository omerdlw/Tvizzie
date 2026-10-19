"use client";

import { useMemo, useState, useTransition, type JSX } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePage } from "@omerdlw/base-framework/kernel";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon, Input, Select } from "@/ui";

interface FilterField {
  allLabel?: string;
  key: string;
  options: readonly { label: string; value: string }[];
  defaultValue?: string;
}

const ANY = "__any__";

const LOOKS = {
  inline: {
    form: "relative min-w-[12rem] flex-1 sm:max-w-xs",
    input:
      "h-10 w-full rounded-[14px] bg-white/5 pr-3 pl-10 text-sm text-white ring-1 ring-white/5 ring-inset placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:outline-none",
    reset:
      "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[14px] px-3 text-xs font-semibold text-white/60 uppercase hover:bg-white/10 hover:text-white",
    root: "mb-5 flex flex-wrap items-center gap-2",
    select: "min-w-0 flex-1 basis-[8.5rem] sm:w-44 sm:flex-none",
    trigger: undefined,
  },
  // Beside the dock, the filters stand on the dock's own glass, as tall as
  // its buttons and on the same floor as it.
  rail: {
    form: "relative max-w-full",
    input:
      "h-10 w-52 max-w-full rounded-full bg-black/60 pr-4 pl-10 text-sm text-white ring-1 ring-white/10 backdrop-blur-lg ring-inset placeholder:text-white/40 hover:bg-black/70 focus:bg-black/70 focus:outline-none",
    reset:
      "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-black/60 px-4 text-xs font-semibold text-white/70 uppercase ring-1 ring-white/10 backdrop-blur-lg ring-inset hover:bg-white/10 hover:text-white",
    root: "flex flex-col justify-end gap-1.5",
    select: "w-52 max-w-full",
    trigger:
      "h-10 rounded-full bg-black/60 px-4 py-0 text-sm ring-white/10 backdrop-blur-lg hover:bg-black/70 aria-expanded:bg-black/70",
  },
} as const;

interface FilterProps {
  fields: readonly FilterField[];
  searchPlaceholder: string | null;
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
}: FilterProps & {
  className?: string;
  look: keyof typeof LOOKS;
  part?: "all" | "first" | "rest";
}): JSX.Element {
  const look = LOOKS[name];
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const query = search.get("q") ?? "";
  const [text, setText] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);

  if (query !== seenQuery) {
    setSeenQuery(query);
    setText(query);
  }

  const apply = (changes: Record<string, string | null>) => {
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
  };

  const isFiltered =
    Boolean(query) ||
    fields.some((field) => {
      const value = search.get(field.key);
      return Boolean(value) && value !== (field.defaultValue ?? "");
    });

  const items: JSX.Element[] = [];
  if (searchPlaceholder) {
    items.push(
      <form
        className={look.form}
        key="q"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: text.trim() || null });
        }}
        role="search"
      >
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white/40"
          icon="solar:magnifer-linear"
          size={15}
        />
        <Input
          aria-label={searchPlaceholder}
          className={look.input}
          maxLength={80}
          onBlur={() => {
            if (text.trim() !== query) apply({ q: text.trim() || null });
          }}
          onChange={(event) => setText(event.target.value)}
          placeholder={searchPlaceholder}
          value={text}
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
    <div className={cn(look.root, pending && "opacity-70", className)}>
      {shown}
      {isFiltered && part !== "first" ? (
        <Button
          className={look.reset}
          onClick={() => {
            setText("");
            apply({
              q: null,
              ...Object.fromEntries(fields.map((field) => [field.key, null])),
            });
          }}
        >
          <Icon icon="solar:close-circle-linear" size={14} />
          Reset
        </Button>
      ) : null}
    </div>
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
                />
              ),
              right: (
                <FilterControls
                  className="items-start"
                  fields={fields}
                  look="rail"
                  part="rest"
                  searchPlaceholder={searchPlaceholder}
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
    />
  );
}
