type LegalBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: readonly string[] };

export interface LegalSection {
  blocks: readonly LegalBlock[];
  title: string;
}

export interface LegalDocument {
  description: string;
  icon: string;
  intro: string;
  path: "/privacy" | "/terms";
  sections: readonly LegalSection[];
  title: string;
}
