import type { JSX } from "react";
import {
  readMonth,
  shiftMonth,
  type SearchParams,
} from "@/features/account/lib/browse";
import { DiaryChrome } from "@/features/account/components/browse/diary-chrome";
import { DiaryLedger } from "@/features/account/components/browse/diary-ledger";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { getDiaryMonth } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export default async function AccountDiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const diary = await getDiaryMonth({
    accountId: account.id,
    client,
    month: readMonth(query),
  });

  const base = `/account/${encodeURIComponent(account.username)}`;
  const href = (month: string) => `${base}/diary?month=${month}`;
  const hasPrevious = diary.first !== null && diary.month > diary.first;
  const hasNext = diary.last !== null && diary.month < diary.last;

  return (
    <div className="flex w-full flex-col">
      {diary.first ? (
        <DiaryChrome
          label={MONTH.format(new Date(`${diary.month}-01T00:00:00Z`))}
          latest={
            diary.last && diary.month !== diary.last ? href(diary.last) : null
          }
          next={hasNext ? href(shiftMonth(diary.month, 1)) : null}
          previous={hasPrevious ? href(shiftMonth(diary.month, -1)) : null}
        />
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
    </div>
  );
}
