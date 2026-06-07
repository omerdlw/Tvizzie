'use client';

import { useEffect, useState } from 'react';
import { TMDB_IMG } from '@/core/constants';
import { useAuthSessionReady } from '@/core/modules/auth';
import Container, { CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/core/modules/modal/container';
import { useModalActions } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { getUserListMemberships, subscribeToUserLists, toggleUserListItem } from '@/core/services/media/lists';
import { cn } from '@/core/utils';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import { AnimatePresence, motion } from 'framer-motion';

const pickerSpringTransition = Object.freeze({
  type: 'spring',
  stiffness: 220,
  damping: 25,
  mass: 0.95,
});

const pickerButtonSpring = Object.freeze({
  type: 'spring',
  stiffness: 380,
  damping: 24,
  mass: 0.65,
});

const pickerButtonTap = Object.freeze({});

function getPickerRowAnimation(index = 0) {
  return Object.freeze({
    initial: Object.freeze({ opacity: 0, y: 4 }),
    animate: Object.freeze({ opacity: 1, y: 0 }),
    exit: Object.freeze({ opacity: 0, y: 2 }),
    transition: Object.freeze({
      opacity: { duration: 0.15, ease: 'easeOut' },
      y: { type: 'spring', stiffness: 350, damping: 30, delay: Math.min(index * 0.015, 0.1) },
    }),
  });
}

const MotionButton = motion(Button);

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const LIST_PICKER_STACK_SKELETON_BACKGROUNDS = ['#f8f8f8', '#f3f3f3', '#efefef', '#ebebeb'];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

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

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function ListPickerModal({ close, data }) {
  const { openModal } = useModalActions();
  const toast = useToast();
  const userId = data?.userId ?? null;
  const media = data?.media ?? null;
  const isAuthSessionReady = useAuthSessionReady(userId);
  const [lists, setLists] = useState([]);
  const [initialMemberships, setInitialMemberships] = useState({});
  const [draftMemberships, setDraftMemberships] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // Derived Values
  const selectedCount = lists.filter((list) => Boolean(draftMemberships[list.id])).length;
  const pendingListIds = getChangedListIds(lists, initialMemberships, draftMemberships);
  const pendingChangesCount = pendingListIds.length;
  const hasPendingChanges = pendingChangesCount > 0;

  // Effects
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

  // Handlers
  const handleOpenCreator = () => {
    openModal('CREATE_LIST_MODAL', undefined, {
      data: {
        media,
      },
    });
  };
  const handleToggleDraft = (listId) => {
    setDraftMemberships((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };
  const handleApplyChanges = async () => {
    if (isApplying || !userId || !media || !hasPendingChanges) return;
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
      const next = {
        ...prev,
      };
      successfulListIds.forEach((listId) => {
        next[listId] = nextMemberships[listId];
      });
      return next;
    });
    setIsApplying(false);
    if (failedListTitles.length > 0) {
      if (successfulListIds.length > 0) {
        toast.warning(`${successfulListIds.length}changes applied,${failedListTitles.length}failed. Retry to finish.`);
      } else {
        toast.error('Changes could not be applied. Please try again.');
      }
      return;
    }
    close({
      memberships: nextMemberships,
      selectedListIds: Object.keys(nextMemberships).filter((id) => Boolean(nextMemberships[id])),
    });
  };
  return (
    <ModalView
      close={close}
      lists={lists}
      draftMemberships={draftMemberships}
      isLoading={isLoading}
      isApplying={isApplying}
      selectedCount={selectedCount}
      pendingChangesCount={pendingChangesCount}
      hasPendingChanges={hasPendingChanges}
      handleOpenCreator={handleOpenCreator}
      handleToggleDraft={handleToggleDraft}
      handleApplyChanges={handleApplyChanges}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({
  close,
  lists,
  draftMemberships,
  isLoading,
  isApplying,
  selectedCount,
  pendingChangesCount,
  hasPendingChanges,
  handleOpenCreator,
  handleToggleDraft,
  handleApplyChanges,
}) {
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
            <MotionButton
              type="button"
              onClick={close}
              disabled={isApplying}
              {...pickerButtonTap}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplying || !hasPendingChanges}
              {...pickerButtonTap}
              className={ACTION_BUTTON_CLASS}
            >
              {isApplying ? 'Applying' : 'Apply changes'}
            </MotionButton>
          </>
        ),
      }}
    >
      <section className="flex min-h-0 flex-col gap-3">
        <header className="mb-1 flex items-center justify-between gap-3 px-1">
          <h2 className="text-[11px] font-bold tracking-widest text-black/50 uppercase">Your Lists</h2>
          <MotionButton
            type="button"
            onClick={handleOpenCreator}
            disabled={isApplying}
            {...pickerButtonTap}
            className={CANCEL_BUTTON_CLASS}
          >
            Create new list
          </MotionButton>
        </header>

        <div className="max-h-[56dvh] min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain rounded-[14px]">
          {isLoading && <LoadingSkeleton />}

          {!isLoading && lists.length === 0 && (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-[14px] border border-dashed border-black/10 text-center">
              <p className="text-[11px] font-bold tracking-widest text-black/50 uppercase">No lists yet</p>
              <p className="mt-1 text-sm text-black/70">Create your first list with the button above.</p>
            </div>
          )}

          {!isLoading && lists.length > 0 && (
            <AnimatePresence mode="popLayout">
              {lists.map((list, index) => {
                const isSelected = Boolean(draftMemberships[list.id]);
                return (
                  <ListRow
                    key={list.id}
                    index={index}
                    list={list}
                    isSelected={isSelected}
                    onToggle={() => handleToggleDraft(list.id)}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>
    </Container>
  );
}
function ListRow({ list, isSelected, onToggle, index }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      {...getPickerRowAnimation(index)}
      layout
      className={cn(
        'group flex w-full items-center gap-4 rounded-[14px] border p-3 text-left transition-all duration-300 ease-out',
        isSelected ? 'bg-info/10 border-info/20' : 'hover:bg-primary border-black/5 hover:border-black/10'
      )}
    >
      <ListPreviewStack list={list} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-black">{list.title}</p>
        {list.description && <p className="line-clamp-2 text-sm leading-snug text-black/70">{list.description}</p>}
      </div>

      <motion.span
        className={cn(
          'mr-1.5 flex size-[22px] shrink-0 items-center justify-center rounded-[8px] border transition-all duration-300 ease-in-out',
          isSelected
            ? 'border-info bg-info text-primary'
            : 'border-black/5 text-black/50 group-hover:border-black/50 group-hover:text-black/70'
        )}
      >
        <Icon icon="material-symbols:check-rounded" size={16} />
      </motion.span>
    </motion.button>
  );
}
function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];
  return (
    <div className="relative h-[68px] w-[82px] shrink-0">
      {previewItems.length === 0 ? (
        <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] rounded-[8px] border border-dashed border-black/10 bg-white text-black/50">
          <Icon icon="solar:list-bold" size={20} />
        </div>
      ) : (
        previewItems.map((item, index) => {
          const imageSrc = getPreviewImage(item);
          return (
            <div
              key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
              className="border-primary absolute bottom-0 overflow-hidden rounded-[8px] border bg-white shadow-xs"
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
                  className="h-full w-full rounded-[6px] object-cover"
                  wrapperClassName="h-full w-full rounded-[6px]"
                />
              ) : (
                <div className="center bg-primary h-full w-full text-black/50">
                  <Icon icon="solar:videocamera-record-bold" size={16} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({
        length: 10,
      }).map((_, index) => (
        <div
          key={`list-picker-skeleton-${index}`}
          className="flex h-24 items-center gap-4 rounded-[14px] border border-black/5 p-3"
        >
          <div className="relative h-[68px] w-[82px] shrink-0">
            {[0, 1, 2, 3].map((stackIndex) => (
              <div
                key={`list-picker-skeleton-stack-${index}-${stackIndex}`}
                className="absolute bottom-0 overflow-hidden rounded-[8px] border border-black/5"
                style={{
                  backgroundColor:
                    LIST_PICKER_STACK_SKELETON_BACKGROUNDS[stackIndex] ||
                    LIST_PICKER_STACK_SKELETON_BACKGROUNDS[LIST_PICKER_STACK_SKELETON_BACKGROUNDS.length - 1],
                  width: '46px',
                  height: `${68 - stackIndex * 6}px`,
                  left: `${stackIndex * 12}px`,
                  zIndex: 4 - stackIndex,
                }}
              ></div>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded-full bg-black/10" />
            <div className="h-3 w-4/5 rounded-full bg-black/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
