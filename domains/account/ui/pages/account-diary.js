'use client';

import { useEffect, useMemo, useState } from 'react';

import { subscribeToWatchDiary } from '@/domains/media/client/watch-tracking';
import AccountAction from '@/domains/shell/navigation/actions/account-action';
import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
import AccountDiary from '@/domains/account/ui/sections/diary/account-diary';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

function getMonthBounds(monthKey) {
  const [year, month] = String(monthKey || '')
    .split('-')
    .map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const finalDay = new Date(nextMonth.getTime() - 86_400_000);
  return {
    fromDate: date.toISOString().slice(0, 10),
    toDate: finalDay.toISOString().slice(0, 10),
  };
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(monthKey, offset) {
  const [year, month] = String(monthKey || '')
    .split('-')
    .map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function useDiaryClientState({ routeData, sectionState }) {
  const initialDiary = routeData?.initialDiary || null;
  const [monthKey, setMonthKey] = useState(initialDiary?.monthKey || getCurrentMonthKey);
  const [entries, setEntries] = useState(
    Array.isArray(initialDiary?.entries) ? initialDiary.entries : [],
  );
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!Array.isArray(initialDiary?.entries));
  const { canViewProfileCollections, isViewerReady, resolvedUserId } = sectionState;
  const bounds = useMemo(() => getMonthBounds(monthKey), [monthKey]);
  const hasSeededMonth =
    initialDiary?.monthKey === monthKey && initialDiary?.userId === resolvedUserId;
  const firstMonthKey = initialDiary?.firstMonthKey || monthKey;

  useEffect(() => {
    if (!isViewerReady || !resolvedUserId || !canViewProfileCollections) {
      setEntries([]);
      setError(null);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(!hasSeededMonth);
    setError(null);
    return subscribeToWatchDiary(
      { ...bounds, limitCount: 250, userId: resolvedUserId },
      (nextEntries) => {
        setEntries(Array.isArray(nextEntries) ? nextEntries : []);
        setIsLoading(false);
      },
      {
        emitCachedPayloadOnSubscribe: hasSeededMonth,
        onError: () => {
          setEntries([]);
          setError('Diary could not be loaded');
          setIsLoading(false);
        },
      },
    );
  }, [bounds, canViewProfileCollections, hasSeededMonth, isViewerReady, resolvedUserId]);

  return {
    entries,
    error,
    isLoading,
    isNextMonthHidden: monthKey >= getCurrentMonthKey(),
    isPreviousMonthHidden: monthKey <= firstMonthKey,
    monthKey,
    onNextMonth: () =>
      setMonthKey((current) =>
        current >= getCurrentMonthKey() ? current : shiftMonth(current, 1),
      ),
    onPreviousMonth: () =>
      setMonthKey((current) => (current <= firstMonthKey ? current : shiftMonth(current, -1))),
  };
}

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountDiaryRegistry',
  navDescription: 'Watch Diary',
  navRegistrySource: 'account-diary',
  resolveOverrides: (
    sectionState,
    { isNextMonthHidden, isPreviousMonthHidden, monthKey, onNextMonth, onPreviousMonth },
  ) => {
    if (!sectionState.canViewProfileCollections && !sectionState.isOwner) {
      return { navActionOverride: null };
    }

    return {
      navActionOverride: (
        <AccountAction
          mode="diary-month"
          isNextMonthHidden={isNextMonthHidden}
          isPreviousMonthHidden={isPreviousMonthHidden}
          monthKey={monthKey}
          onNextMonth={onNextMonth}
          onPreviousMonth={onPreviousMonth}
        />
      ),
    };
  },
});

const DiaryView = createAccountSectionView({
  activeSection: 'diary',
  displayName: 'AccountDiaryView',
  Registry,
  resolveRegistryProps: (
    _,
    { isNextMonthHidden, isPreviousMonthHidden, monthKey, onNextMonth, onPreviousMonth },
  ) => ({
    isNextMonthHidden,
    isPreviousMonthHidden,
    monthKey,
    onNextMonth,
    onPreviousMonth,
  }),
  skeletonVariant: 'activity',
  renderContent: (_sectionState, diaryState) => <AccountDiary {...diaryState} />,
});

const AccountDiaryView = createAccountSectionClient({
  activeTab: 'diary',
  displayName: 'AccountDiaryClient',
  View: DiaryView,
  useSectionClientState: useDiaryClientState,
});

export default AccountDiaryView;
