'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { buildListCreatorHref } from '@/features/account/utils';
import { TMDB_IMG } from '@/core/constants';
import { cn } from '@/core/utils';
import { useAuthSessionReady } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { getUserListMemberships, subscribeToUserLists, toggleUserListItem } from '@/core/services/media/lists.service';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

function getMediaTitle(media = {}) {
  return media?.title || media?.name || 'this title';
}

function getPreviewImage(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

function ListPreviewStack({ list }) {
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  return (
    <div className="relative flex h-[68px] w-[82px] shrink-0 items-end justify-start">
      {previewItems.length > 0 ? (
        previewItems.map((item, index) => (
          <div
            key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
            className="absolute bottom-0 overflow-hidden rounded-[8px] border-2 border-white bg-white shadow-sm ring-1 ring-black/5"
            style={{
              height: `${68 - index * 6}px`,
              left: `${index * 12}px`,
              width: '46px',
              zIndex: previewItems.length - index,
            }}
          >
            {getPreviewImage(item) ? (
              <img
                src={getPreviewImage(item)}
                alt={item.title || item.name || 'Poster'}
                className="h-full w-full rounded-[6px] object-cover"
              />
            ) : (
              <div className="center h-full w-full rounded-[6px] bg-black/5 text-black/30">
                <Icon icon="solar:videocamera-record-bold" size={14} />
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] rounded-[8px] border border-dashed border-black/20 bg-[#f8fafc] text-black/30 shadow-sm">
          <Icon icon="solar:list-bold" size={20} />
        </div>
      )}
    </div>
  );
}

function getChangedListIds(lists, initialMemberships, draftMemberships) {
  return lists
    .map((list) => list.id)
    .filter((listId) => Boolean(draftMemberships[listId]) !== Boolean(initialMemberships[listId]));
}

export default function ListPickerModal({ close, data }) {
  const router = useRouter();
  const toast = useToast();
  const userId = data?.userId || null;
  const isAuthSessionReady = useAuthSessionReady(userId);
  const media = data?.media || null;
  const [lists, setLists] = useState([]);
  const [initialMemberships, setInitialMemberships] = useState({});
  const [draftMemberships, setDraftMemberships] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const mediaTitle = useMemo(() => getMediaTitle(media), [media]);
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
      return undefined;
    }

    if (!isAuthSessionReady) {
      setLists([]);
      setIsLoading(true);
      return undefined;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToUserLists(
      userId,
      (nextLists) => {
        setLists(nextLists);
        setIsLoading(false);
      },
      {
        onError: (error) => {
          toast.error(error?.message || 'Lists are temporarily unavailable');
          setIsLoading(false);
        },
      }
    );

    return () => unsubscribe();
  }, [isAuthSessionReady, toast, userId]);

  useEffect(() => {
    let ignore = false;

    async function loadMemberships() {
      if (!userId || !isAuthSessionReady || !media || lists.length === 0) {
        setInitialMemberships({});
        setDraftMemberships({});
        return;
      }

      try {
        const nextMemberships = await getUserListMemberships({
          listIds: lists.map((list) => list.id),
          media,
          userId,
        });

        if (!ignore) {
          setInitialMemberships(nextMemberships);
          setDraftMemberships(nextMemberships);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error?.message || 'List memberships could not be loaded');
        }
      }
    }

    loadMemberships();

    return () => {
      ignore = true;
    };
  }, [isAuthSessionReady, lists, media, toast, userId]);

  const handleOpenCreator = useCallback(() => {
    close();
    router.push(buildListCreatorHref(media));
  }, [close, media, router]);

  const handleToggleDraft = useCallback((listId) => {
    setDraftMemberships((previous) => ({
      ...previous,
      [listId]: !previous[listId],
    }));
  }, []);

  const handleApplyChanges = useCallback(async () => {
    if (isApplying || !userId || !media || !hasPendingChanges) {
      return;
    }

    setIsApplying(true);

    const nextInitialMemberships = { ...initialMemberships };
    const successfulListIds = [];
    const failedListTitles = [];

    for (const listId of pendingListIds) {
      const targetState = Boolean(draftMemberships[listId]);
      const targetList = lists.find((list) => list.id === listId);

      try {
        const firstAttempt = await toggleUserListItem({ listId, media, userId });
        let resolvedState = Boolean(firstAttempt?.isInList);

        if (resolvedState !== targetState) {
          const secondAttempt = await toggleUserListItem({ listId, media, userId });
          resolvedState = Boolean(secondAttempt?.isInList);
        }

        if (resolvedState !== targetState) {
          failedListTitles.push(targetList?.title || 'Untitled list');
          continue;
        }

        nextInitialMemberships[listId] = resolvedState;
        successfulListIds.push(listId);
      } catch {
        failedListTitles.push(targetList?.title || 'Untitled list');
      }
    }

    setInitialMemberships(nextInitialMemberships);
    setDraftMemberships((previous) => {
      const next = { ...previous };
      successfulListIds.forEach((listId) => {
        next[listId] = nextInitialMemberships[listId];
      });
      return next;
    });

    if (failedListTitles.length > 0) {
      if (successfulListIds.length > 0) {
        toast.warning(
          `${successfulListIds.length} changes applied, ${failedListTitles.length} failed. Retry to finish.`
        );
      } else {
        toast.error('Changes could not be applied. Please try again.');
      }
      setIsApplying(false);
      return;
    }

    toast.success(
      successfulListIds.length === 1
        ? `${mediaTitle} list selection was updated`
        : `${successfulListIds.length} changes applied`
    );
    setIsApplying(false);
    close({
      memberships: nextInitialMemberships,
      selectedListIds: Object.keys(nextInitialMemberships).filter((listId) => Boolean(nextInitialMemberships[listId])),
    });
  }, [
    close,
    draftMemberships,
    hasPendingChanges,
    initialMemberships,
    isApplying,
    lists,
    media,
    mediaTitle,
    pendingListIds,
    toast,
    userId,
  ]);

  return (
    <Container
      className="max-h-[72dvh] w-full sm:w-[660px]"
      header={false}
      close={close}
      bodyClassName="p-4"
      footer={{
        left: (
          <span className="text-xs text-black/70">
            {selectedCount} selected • {pendingChangesCount} pending
          </span>
        ),
        right: (
          <>
            <Button
              type="button"
              onClick={close}
              disabled={isApplying}
              className="bg-primary h-8 rounded-[12px] border border-black/10 px-4 text-xs font-semibold tracking-wide uppercase transition hover:border-black/15 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplying || !hasPendingChanges}
              className="hover:bg-info hover:border-info hover:text-primary h-8 rounded-[12px] border border-black bg-black px-4 text-xs font-semibold tracking-wide text-white uppercase transition disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/50"
            >
              {isApplying ? 'Applying' : 'Apply changes'}
            </Button>
          </>
        ),
      }}
    >
      <section className="flex min-h-0 flex-col gap-3">
        <div className="mb-1 flex items-center justify-between gap-3 px-1">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[11px] font-bold tracking-widest text-black/50 uppercase">Your Lists</h2>
          </div>
          <Button
            type="button"
            onClick={handleOpenCreator}
            disabled={isApplying}
            className="bg-primary h-8 shrink-0 rounded-[12px] border border-black/10 px-3 text-[11px] font-semibold tracking-wide text-black uppercase transition hover:border-black/20 hover:bg-black/2 disabled:cursor-not-allowed"
          >
            Create new list
          </Button>
        </div>

        <div className="max-h-[56dvh] min-h-0 w-full flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-[12px] border border-black/10 bg-black/5" />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-[12px] border border-dashed border-black/15 bg-black/2 text-center">
              <p className="text-[11px] font-bold tracking-widest text-black/50 uppercase">No lists yet</p>
              <p className="mt-1 text-sm text-black/70">Create your first list with the button above.</p>
            </div>
          ) : (
            lists.map((list) => {
              const isSelected = Boolean(draftMemberships[list.id]);

              return (
                <button
                  type="button"
                  key={list.id}
                  onClick={() => handleToggleDraft(list.id)}
                  className={cn(
                    'group flex w-full cursor-pointer items-center justify-between gap-4 rounded-[12px] border p-3 text-left transition-all',
                    isSelected
                      ? 'border-black bg-black/5 shadow-sm'
                      : 'bg-primary border-black/10 hover:border-black/20 hover:bg-black/2'
                  )}
                >
                  <ListPreviewStack list={list} />
                  <div className="flex min-w-0 flex-1 flex-col py-1">
                    <p className="truncate text-[15px] font-semibold text-black">{list.title}</p>
                    {list.description ? (
                      <p className="mt-1 line-clamp-2 max-w-[90%] text-sm leading-snug text-black/60">
                        {list.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center pr-2">
                    <div
                      className={cn(
                        'flex size-[22px] items-center justify-center rounded-full border transition-all',
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 text-black/20 group-hover:border-black/40 group-hover:text-black/40'
                      )}
                    >
                      <Icon icon="material-symbols:check-rounded" size={14} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
    </Container>
  );
}
