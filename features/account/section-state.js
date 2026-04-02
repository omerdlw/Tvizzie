'use client'

import { ACCOUNT_SECTION_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from './utils'

export default function AccountSectionState({ message }) {
  return (
    <section className={ACCOUNT_SECTION_CLASS}>
      <div className={ACCOUNT_SECTION_SHELL_CLASS}>
        <div className=" border border-white/10 px-5 py-5 text-sm font-semibold uppercase text-white">
          {message}
        </div>
      </div>
    </section>
  )
}
