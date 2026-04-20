'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { TMDB_IMG } from '@/core/constants';
import { useAuthSessionReady } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import { getUserListMemberships, subscribeToUserLists, toggleUserListItem } from '@/core/services/media/lists.service';
import { cn } from '@/core/utils';
import { buildListCreatorHref } from '@/features/account/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

const ACTION_BUTTON_CLASS =
  'h-8 shrink-0 rounded-[12px] border border-black/10 px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition';
const LIST_PICKER_STACK_SKELETON_BACKGROUNDS = ['#f8f8f8', '#f3f3f3', '#efefef', '#ebebeb'];

function getPreviewImage(item) {
  return item?.poster_path_full || (item?.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null);
}

function getChangedListIds(lists, initialMemberships, draftMemberships) {
  return lists.map((list) => list.id).filter((id) => Boolean(initialMemberships[id]) !== Boolean(draftMemberships[id]));
}

function ListPreviewStack({ list }) {
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  return (
    <div className="relative h-[68px] w-[82px] shrink-0">
      {previewItems.length === 0 ? (
        <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] border border-dashed border-black/10 bg-white text-black/50">
          <Icon icon="solar:list-bold" size={20} />
        </div>
      ) : (
        previewItems.map((item, index) => {
          const imageSrc = getPreviewImage(item);

          return (
            <div
              key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
              className="border-primary absolute bottom-0 overflow-hidden rounded-[10px] border-[1.5px] bg-white shadow-xs ring-1 ring-black/5"
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
                  alt={item.title || item.name || 'Poster'}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  wrapperClassName="h-full w-full"
                />
              ) : (
                <div className="center bg-primary h-full w-full text-black/50">
                  <Icon icon="solar:videocamera-record-bold" size={14} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ListPickerModal({ close, data }) {
  const router = useRouter();
  const toast = useToast();

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
    [lists, draftMemberships]
  );

  const pendingListIds = useMemo(
    () => getChangedListIds(lists, initialMemberships, draftMemberships),
    [lists, initialMemberships, draftMemberships]
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
  }, [userId, isAuthSessionReady, toast]);

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
  }, [userId, isAuthSessionReady, media, lists, toast]);

  const handleOpenCreator = useCallback(() => {
    close();
    router.push(buildListCreatorHref(media));
  }, [close, router, media]);

  const handleToggleDraft = useCallback((listId) => {
    setDraftMemberships((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  }, []);

  const handleApplyChanges = useCallback(async () => {
    if (isApplying || !userId || !media || !hasPendingChanges) return;

    setIsApplying(true);

    const nextMemberships = { ...initialMemberships };
    const successfulListIds = [];
    const failedListTitles = [];

    for (const listId of pendingListIds) {
      const targetState = Boolean(draftMemberships[listId]);
      const targetList = lists.find((list) => list.id === listId);

      try {
        let result = await toggleUserListItem({ listId, media, userId });
        let resolvedState = Boolean(result?.isInList);

        if (resolvedState !== targetState) {
          result = await toggleUserListItem({ listId, media, userId });
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
              className={`${ACTION_BUTTON_CLASS} text-black/70 hover:bg-black/5 hover:text-black`}
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
        <header className="mb-1 flex items-center justify-between gap-3 px-1">
          <h2 className="text-[11px] font-bold tracking-widest text-black/50 uppercase">Your Lists</h2>
          <Button
            type="button"
            onClick={handleOpenCreator}
            disabled={isApplying}
            className={`${ACTION_BUTTON_CLASS} text-black/70 hover:bg-black/5 hover:text-black`}
          >
            Create new list
          </Button>
        </header>

        <div className="max-h-[56dvh] min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
          {isLoading && (
            <div className="space-y-2.5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={`list-picker-skeleton-${index}`}
                  className="flex h-24 animate-pulse items-center gap-4 rounded-[14px] border border-black/10 bg-white/80 p-3"
                >
                  <div className="relative h-[68px] w-[82px] shrink-0">
                    {[0, 1, 2, 3].map((stackIndex) => (
                      <div
                        key={`list-picker-skeleton-stack-${index}-${stackIndex}`}
                        className="absolute bottom-0 overflow-hidden rounded-[10px] border border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        style={{
                          backgroundColor:
                            LIST_PICKER_STACK_SKELETON_BACKGROUNDS[stackIndex] ||
                            LIST_PICKER_STACK_SKELETON_BACKGROUNDS[LIST_PICKER_STACK_SKELETON_BACKGROUNDS.length - 1],
                          width: '46px',
                          height: `${68 - stackIndex * 6}px`,
                          left: `${stackIndex * 12}px`,
                          zIndex: 4 - stackIndex,
                        }}
                      >
                        <div className="absolute inset-x-0 bottom-0 h-7 bg-black/[0.04]" />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-black/[0.09]" />
                    <div className="h-3 w-4/5 rounded bg-black/[0.07]" />
                  </div>
                  <div className="size-[22px] shrink-0 rounded-full border border-black/10 bg-black/[0.06]" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && lists.length === 0 && (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-[14px] border border-dashed border-black/15 bg-black/2 text-center">
              <p className="text-[11px] font-bold tracking-widest text-black/50 uppercase">No lists yet</p>
              <p className="mt-1 text-sm text-black/70">Create your first list with the button above.</p>
            </div>
          )}

          {!isLoading &&
            lists.length > 0 &&
            lists.map((list) => {
              const isSelected = Boolean(draftMemberships[list.id]);

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => handleToggleDraft(list.id)}
                  className={cn(
                    'group flex w-full items-center gap-4 rounded-[14px] border p-3 text-left transition-all',
                    isSelected ? 'bg-info/20 border-black/20' : 'hover:bg-primary border-black/10 hover:border-black/15'
                  )}
                >
                  <ListPreviewStack list={list} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-black">{list.title}</p>
                    {list.description && (
                      <p className="line-clamp-2 text-sm leading-snug text-black/70">{list.description}</p>
                    )}
                  </div>

                  <span
                    className={cn(
                      'flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-all',
                      isSelected
                        ? 'border-info bg-info text-primary'
                        : 'border-black/10 text-black/50 group-hover:border-black/40 group-hover:text-black/70'
                    )}
                  >
                    <Icon icon="material-symbols:check-rounded" size={16} />
                  </span>
                </button>
              );
            })}
        </div>
      </section>
    </Container>
  );
}
