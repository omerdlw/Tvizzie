'use client';

import { ACCOUNT_SECTION_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from './utils';

export default function AccountSectionState({ message }) {
  return (
    <section className={ACCOUNT_SECTION_CLASS}>
      <div className={ACCOUNT_SECTION_SHELL_CLASS}>
        <div className="border border-[#0ea5e9] px-5 py-5 text-sm font-semibold text-[#0f172a] uppercase">
          {message}
        </div>
      </div>
    </section>
  );
}
