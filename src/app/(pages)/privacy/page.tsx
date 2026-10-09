import type { JSX } from "react";
import type { Metadata } from "next";
import { LegalPage, PRIVACY } from "@/features/legal";

export const metadata: Metadata = {
  alternates: { canonical: PRIVACY.path },
  description: PRIVACY.description,
  title: PRIVACY.title,
};

export default function PrivacyPage(): JSX.Element {
  return <LegalPage document={PRIVACY} />;
}
