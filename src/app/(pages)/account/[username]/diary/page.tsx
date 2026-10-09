import type { JSX } from "react";
import {
  readMonth,
  shiftMonth,
  type SearchParams,
} from "@/features/account/lib/browse";
import { AccountLink } from "@/features/account/components/browse/account-link";
import { DiaryLedger } from "@/features/account/components/browse/diary-ledger";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { SectionHeading } from "@/features/account/components/browse/section-heading";
import { getDiaryMonth } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";
import { Icon } from "@/ui";

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const STEP = "center size-9 rounded-[12px] ring-1 ring-inset";

export default async function AccountDiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner } = await getAccountPageContext(username);
  const diary = await getDiaryMonth({
    accountId: account.id,
    client,
    month: readMonth(query),
  });

  const base = `/account/${encodeURIComponent(account.username)}`;
  const href = (month: string) => `${base}/diary?month=${month}`;
  const hasPrevious = diary.first !== null && diary.month > diary.first;
  const hasNext = diary.last !== null && diary.month < diary.last;
  const label = MONTH.format(new Date(`${diary.month}-01T00:00:00Z`));

  return (
    <section className="w-full">
      <SectionHeading
        icon="solar:calendar-mark-bold"
        summary={`${diary.rows.length} ${diary.rows.length === 1 ? "entry" : "entries"}`}
        title="Diary"
      />

      {diary.first ? (
        <div className="mb-5 flex items-center gap-2">
          {hasPrevious ? (
            <AccountLink
              aria-label="Previous month"
              className={`${STEP} text-white/70 ring-white/5 hover:bg-white/10`}
              href={href(shiftMonth(diary.month, -1))}
            >
              <Icon icon="solar:alt-arrow-left-linear" size={14} />
            </AccountLink>
          ) : (
            <span className={`${STEP} text-white/20 ring-white/5`}>
              <Icon icon="solar:alt-arrow-left-linear" size={14} />
            </span>
          )}
          <h3 className="min-w-[10rem] text-center text-sm font-semibold text-white">
            {label}
          </h3>
          {hasNext ? (
            <AccountLink
              aria-label="Next month"
              className={`${STEP} text-white/70 ring-white/5 hover:bg-white/10`}
              href={href(shiftMonth(diary.month, 1))}
            >
              <Icon icon="solar:alt-arrow-right-linear" size={14} />
            </AccountLink>
          ) : (
            <span className={`${STEP} text-white/20 ring-white/5`}>
              <Icon icon="solar:alt-arrow-right-linear" size={14} />
            </span>
          )}
          {diary.last && diary.month !== diary.last ? (
            <AccountLink
              className="ml-2 text-xs font-semibold text-white/50 uppercase hover:text-white"
              href={href(diary.last)}
            >
              Latest
            </AccountLink>
          ) : null}
        </div>
      ) : null}

      {diary.rows.length > 0 ? (
        <DiaryLedger
          isOwner={isOwner}
          username={account.username}
          rows={diary.rows}
        />
      ) : (
        <EmptyState icon="solar:calendar-mark-bold">
          {diary.first
            ? "No diary entries in this month"
            : isOwner
              ? "Use “Log to diary” on a movie page to start your diary"
              : "Nothing in the diary yet"}
        </EmptyState>
      )}
    </section>
  );
}
