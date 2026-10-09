"use client";

import { useState, useTransition, type JSX } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon, Input, Select } from "@/ui";

interface FilterField {
  allLabel?: string;
  key: string;
  options: readonly { label: string; value: string }[];
  defaultValue?: string;
}

const ANY = "__any__";

export function FilterBar({
  fields,
  searchPlaceholder = "Search",
}: {
  fields: readonly FilterField[];
  searchPlaceholder?: string | null;
}): JSX.Element {
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

  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center gap-2",
        pending && "opacity-70",
      )}
    >
      {searchPlaceholder ? (
        <form
          className="relative min-w-[12rem] flex-1 sm:max-w-xs"
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
            className="h-10 w-full rounded-[14px] bg-white/5 pr-3 pl-10 text-sm text-white ring-1 ring-white/5 ring-inset placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
            maxLength={80}
            onBlur={() => {
              if (text.trim() !== query) apply({ q: text.trim() || null });
            }}
            onChange={(event) => setText(event.target.value)}
            placeholder={searchPlaceholder}
            value={text}
          />
        </form>
      ) : null}

      {fields.map((field) => {
        const current = search.get(field.key) ?? field.defaultValue ?? ANY;
        const options = field.allLabel
          ? [{ label: field.allLabel, value: ANY }, ...field.options]
          : field.options;
        return (
          <Select
            ariaLabel={field.allLabel ?? field.key}
            className="w-44"
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
          />
        );
      })}

      {isFiltered ? (
        <Button
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[14px] px-3 text-xs font-semibold text-white/60 uppercase hover:bg-white/10 hover:text-white"
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
