import type { JSX } from "react";
import { PAGE_CLASS } from "@/motion";
import { LEGAL_LAST_UPDATED } from "../lib/constants";
import type { LegalDocument } from "../lib/types";
import { LegalLinks } from "./legal-links";
import { LegalText } from "./legal-text";

export function LegalPage({
  document,
}: {
  document: LegalDocument;
}): JSX.Element {
  return (
    <main className={PAGE_CLASS}>
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6">
        <header className="flex flex-col items-center gap-4 pt-24 pb-10 text-center sm:pt-28">
          <h1 className="font-zuume text-5xl leading-none font-bold uppercase sm:text-6xl">
            {document.title}
          </h1>
          <p className="max-w-xl text-sm leading-7 text-white/60">
            {document.intro}
          </p>
          <p className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
        </header>

        <LegalLinks active={document.path} />

        <article className="mt-6 flex flex-col gap-9 rounded-[20px] bg-white/[0.03] p-6 ring-1 ring-white/5 ring-inset sm:p-8">
          {document.sections.map((section) => (
            <section className="flex flex-col gap-3" key={section.title}>
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-sm leading-7 text-white/70">
                {section.blocks.map((block, index) =>
                  block.kind === "paragraph" ? (
                    <p key={index}>
                      <LegalText text={block.text} />
                    </p>
                  ) : (
                    <ul
                      className="flex list-disc flex-col gap-2 pl-5"
                      key={index}
                    >
                      {block.items.map((item) => (
                        <li key={item}>
                          <LegalText text={item} />
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
