import type { JSX } from "react";
import { LegalLinks } from "@/features/legal";
import { project } from "@config/project";
import { TMDB_ATTRIBUTION } from "../lib/constants";

export function HomeFooter(): JSX.Element {
  return (
    <footer className="flex w-full flex-col items-center gap-5 border-t border-white/5 pt-10 text-center">
      <p className="font-zuume text-3xl leading-none font-bold text-white/80 uppercase">
        {project.name}
      </p>
      <p className="max-w-md text-xs leading-5 text-white/50">
        {TMDB_ATTRIBUTION} Movie data and images come from{" "}
        <a
          className="underline underline-offset-4 hover:text-white"
          href="https://www.themoviedb.org"
          rel="noreferrer"
          target="_blank"
        >
          TMDB
        </a>
        .
      </p>
      <div className="w-full max-w-md">
        <LegalLinks active={null} />
      </div>
    </footer>
  );
}
