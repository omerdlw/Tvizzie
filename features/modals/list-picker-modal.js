'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TMDB_IMG } from '@/core/constants';

import { useAuthSessionReady } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useModalActions } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';

import { getUserListMemberships, subscribeToUserLists, toggleUserListItem } from '@/core/services/media/lists.service';

import { cn } from '@/core/utils';

import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';

import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

const ACTION_BUTTON_CLASS = 'h-8 shrink-0 border px-4 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ';

const LIST_PICKER_STACK_SKELETON_CLASSES = [
  'skeleton-block',
  'skeleton-block-soft',
  'skeleton-block-soft',
  'skeleton-block-soft',
];

function getPreviewImage(item) {
  return (
    getPreferredMoviePosterSrc(item, 'w342') ||
    item?.poster_path_full ||
    (item?.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null)
  );
}

function getChangedListIds(lists, initialMemberships, draftMemberships) {
  return lists.map((list) => list.id).filter((id) => Boolean(initialMemberships[id]) !== Boolean(draftMemberships[id]));
}

function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();

  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  if (previewItems.length === 0) {
    return (
      <div className="relative h-[68px] w-[82px] shrink-0">
        <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] border border-white/5 text-white/50">
          <Icon icon="solar:list-bold" size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[68px] w-[82px] shrink-0">
      {previewItems.map((item, index) => {
        const imageSrc = getPreviewImage(item);

        return (
          <div
            key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
            className="absolute bottom-0 overflow-hidden border border-white/5"
            style={{
              width: '46px',
              height: `${68 - index * 6}px`,
              left: `${index * 12}px`,
              zIndex: previewItems.length - index,
            }}
          >
            {imageSrc ? (
              <AdaptiveImage
                mode="img"
                src={imageSrc}
                loading="lazy"
                decoding="async"
                alt={item.title || item.name || 'Poster'}
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full"
              />
            ) : (
              <div className="center bg-primary h-full w-full text-white/50">
                <Icon icon="solar:videocamera-record-bold" size={14} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListSkeletonRow({ index }) {
  return (
    <div className="flex h-24 items-center gap-4 border border-white/5 p-2">
      <div className="relative h-[68px] w-[82px] shrink-0">
        {[0, 1, 2, 3].map((stackIndex) => (
          <div
            key={`list-picker-skeleton-${index}-${stackIndex}`}
            className={cn(
              'absolute bottom-0 overflow-hidden border border-white/5 shadow-sm',
              LIST_PICKER_STACK_SKELETON_CLASSES[stackIndex] || LIST_PICKER_STACK_SKELETON_CLASSES.at(-1)
            )}
            style={{
              width: '46px',
              height: `${68 - stackIndex * 6}px`,
              left: `${stackIndex * 12}px`,
              zIndex: 4 - stackIndex,
            }}
          >
            <div className="skeleton-block absolute inset-x-0 bottom-0 h-7" />
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="skeleton-block h-4 w-2/5" />
        <div className="skeleton-block-soft h-3 w-4/5" />
      </div>

      <div className="skeleton-block size-[22px] shrink-0 border border-white/10" />
    </div>
  );
}

function ListRow({ list, isSelected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(list.id)}
      className={cn(
        'group flex w-full items-center gap-4 border p-2 text-left',
        isSelected ? 'bg-info/20 border-white/20' : 'hover:bg-primary border-white/5 hover:border-white/15'
      )}
    >
      <ListPreviewStack list={list} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{list.title}</p>

        {list.description && <p className="line-clamp-2 text-sm leading-snug text-white/70">{list.description}</p>}
      </div>

      <span
        className={cn(
          'flex size-[22px] shrink-0 items-center justify-center border',
          isSelected
            ? 'border-info bg-info text-primary'
            : 'border-white/5 text-white/50 group-hover:border-white/10 group-hover:text-white'
        )}
      >
        <Icon icon="material-symbols:check-rounded" size={16} />
      </span>
    </button>
  );
}

export default function ListPickerModal({ close, data }) {
  const toast = useToast();

  const { openModal } = useModalActions();

  const userId = data?.userId ?? null;
  const media = data?.media ?? null;

  const isAuthSessionReady = useAuthSessionReady(userId);

  const [lists, setLists] = useState([]);

  const [initialMemberships, setInitialMemberships] = useState({});

  const [draftMemberships, setDraftMemberships] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const selectedCount = useMemo(
    () => lists.filter((list) => Boolean(draftMemberships[list.id])).length,
    [draftMemberships, lists]
  );

  const pendingListIds = useMemo(
    () => getChangedListIds(lists, initialMemberships, draftMemberships),
    [draftMemberships, initialMemberships, lists]
  );

  const pendingChangesCount = pendingListIds.length;

  const hasPendingChanges = pendingChangesCount > 0;

  useEffect(() => {
    if (!userId) {
      setLists([]);
      setIsLoading(false);

      return;
    }

    if (!isAuthSessionReady) {
      setLists([]);
      setIsLoading(true);

      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToUserLists(
      userId,
      (nextLists) => {
        setLists(Array.isArray(nextLists) ? nextLists : []);

        setIsLoading(false);
      },
      {
        onError: (error) => {
          setLists([]);
          setIsLoading(false);

          toast.error(error?.message || 'Lists are temporarily unavailable');
        },
      }
    );

    return unsubscribe;
  }, [isAuthSessionReady, toast, userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemberships() {
      if (!userId || !isAuthSessionReady || !media || lists.length === 0) {
        setInitialMemberships({});
        setDraftMemberships({});

        return;
      }

      try {
        const memberships = await getUserListMemberships({
          userId,
          media,
          listIds: lists.map((list) => list.id),
        });

        if (!cancelled) {
          setInitialMemberships(memberships);
          setDraftMemberships(memberships);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || 'List memberships could not be loaded');
        }
      }
    }

    loadMemberships();

    return () => {
      cancelled = true;
    };
  }, [isAuthSessionReady, lists, media, toast, userId]);

  const handleOpenCreator = useCallback(() => {
    openModal('CREATE_LIST_MODAL', undefined, {
      data: { media },
    });
  }, [media, openModal]);

  const handleToggleDraft = useCallback((listId) => {
    setDraftMemberships((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  }, []);

  const handleApplyChanges = useCallback(async () => {
    if (isApplying || !userId || !media || !hasPendingChanges) {
      return;
    }

    setIsApplying(true);

    const nextMemberships = {
      ...initialMemberships,
    };

    const successfulListIds = [];
    const failedListTitles = [];

    for (const listId of pendingListIds) {
      const targetState = Boolean(draftMemberships[listId]);

      const targetList = lists.find((list) => list.id === listId);

      try {
        let result = await toggleUserListItem({
          listId,
          media,
          userId,
        });

        let resolvedState = Boolean(result?.isInList);

        if (resolvedState !== targetState) {
          result = await toggleUserListItem({
            listId,
            media,
            userId,
          });

          resolvedState = Boolean(result?.isInList);
        }

        if (resolvedState !== targetState) {
          failedListTitles.push(targetList?.title || 'Untitled list');

          continue;
        }

        nextMemberships[listId] = resolvedState;

        successfulListIds.push(listId);
      } catch {
        failedListTitles.push(targetList?.title || 'Untitled list');
      }
    }

    setInitialMemberships(nextMemberships);

    setDraftMemberships((prev) => {
      const next = { ...prev };

      successfulListIds.forEach((listId) => {
        next[listId] = nextMemberships[listId];
      });

      return next;
    });

    setIsApplying(false);

    if (failedListTitles.length > 0) {
      if (successfulListIds.length > 0) {
        toast.warning(
          `${successfulListIds.length} changes applied, ${failedListTitles.length} failed. Retry to finish.`
        );
      } else {
        toast.error('Changes could not be applied. Please try again.');
      }

      return;
    }

    close({
      memberships: nextMemberships,
      selectedListIds: Object.keys(nextMemberships).filter((id) => Boolean(nextMemberships[id])),
    });
  }, [
    close,
    draftMemberships,
    hasPendingChanges,
    initialMemberships,
    isApplying,
    lists,
    media,
    pendingListIds,
    toast,
    userId,
  ]);

  return (
    <Container
      close={close}
      header={false}
      className="max-h-[72dvh] w-full sm:w-[660px]"
      bodyClassName="p-2"
      footer={{
        left: (
          <span className="text-xs text-white/70">
            {selectedCount} selected • {pendingChangesCount} pending
          </span>
        ),

        right: (
          <>
            <Button
              type="button"
              onClick={close}
              disabled={isApplying}
              className={cn(ACTION_BUTTON_CLASS, 'border-white/5 text-white/70 hover:bg-white/10 hover:text-white')}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplying || !hasPendingChanges}
              className="hover:bg-info hover:border-info h-8 border border-white bg-white px-4 text-xs font-semibold tracking-wide text-black uppercase hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-white/50"
            >
              {isApplying ? 'Applying' : 'Apply changes'}
            </Button>
          </>
        ),
      }}
    >
      <section className="flex min-h-0 flex-col gap-2">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Your Lists</h2>

          <Button
            type="button"
            onClick={handleOpenCreator}
            disabled={isApplying}
            className={cn(
              ACTION_BUTTON_CLASS,
              'border-dashed border-white/5 text-white/70 hover:bg-white/5 hover:text-white'
            )}
          >
            Create new list
          </Button>
        </header>

        <div className="max-h-[56dvh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
          {isLoading && (
            <div className="space-y-2.5">
              {Array.from({
                length: 10,
              }).map((_, index) => (
                <ListSkeletonRow key={`list-picker-skeleton-${index}`} index={index} />
              ))}
            </div>
          )}

          {!isLoading && lists.length === 0 && (
            <div className="flex min-h-40 flex-col items-center justify-center border border-dashed border-white/5 text-center">
              <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">No lists yet</p>

              <p className="mt-1 text-sm text-white/70">Create your first list with the button above.</p>
            </div>
          )}

          {!isLoading &&
            lists.length > 0 &&
            lists.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                isSelected={Boolean(draftMemberships[list.id])}
                onToggle={handleToggleDraft}
              />
            ))}
        </div>
      </section>
    </Container>
  );
}
