import type { JSX } from "react";
import type { Metadata } from "next";
import { LegalPage, TERMS } from "@/features/legal";

export const metadata: Metadata = {
  alternates: { canonical: TERMS.path },
  description: TERMS.description,
  title: TERMS.title,
};

export default function TermsPage(): JSX.Element {
  return <LegalPage document={TERMS} />;
}
