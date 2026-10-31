import type { ReactNode } from "react";

function foldChar(char: string): string {
  return char
    .replace(/[ıİ]/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

function folded(text: string): { origin: number[]; value: string } {
  let value = "";
  const origin: number[] = [];
  for (let index = 0; index < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(index) ?? 0);
    for (const piece of foldChar(char)) {
      if (piece === " " && (value === "" || value.endsWith(" "))) continue;
      value += piece;
      origin.push(index);
    }
    index += char.length;
  }
  return { origin, value };
}

function locate(text: string, query: string): [number, number] | null {
  const needle = folded(query).value.trim();
  if (!needle) return null;
  const { origin, value } = folded(text);

  const atWord = ` ${value}`.indexOf(` ${needle}`);
  const at = atWord >= 0 ? atWord : value.indexOf(needle);
  if (at < 0) return null;

  const last = origin[at + needle.length - 1];
  const end = last + String.fromCodePoint(text.codePointAt(last) ?? 0).length;
  return [origin[at], end];
}

export function Highlight({
  query,
  text,
}: {
  query?: string;
  text: string;
}): ReactNode {
  const range = query ? locate(text, query) : null;
  if (!range) return text;
  const [start, end] = range;
  return (
    <>
      <span className="opacity-60">{text.slice(0, start)}</span>
      <mark className="bg-transparent text-inherit">
        {text.slice(start, end)}
      </mark>
      <span className="opacity-60">{text.slice(end)}</span>
    </>
  );
}
