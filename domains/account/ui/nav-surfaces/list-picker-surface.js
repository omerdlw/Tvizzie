'use client';

import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS, TMDB_IMG } from '@/shared/constants';
import { useAuthSessionReady } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav';
import { NAV_FADE_TRANSITION, NAV_MICRO_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import {
  getUserListMemberships,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/domains/media/client/collections/lists';
import { cn } from '@/shared/utils';
import { createCreateListSurfaceEntry } from '@/domains/account/ui/nav-surfaces/create-list-surface';
import { getNavActionClass } from '@/ui/primitives/navigation-action-styles';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';

// --- CONSTANTS & HELPERS ---

const STACK_SKELETON_CLASSES = [
  'skeleton-block',
  'skeleton-block-soft',
  'skeleton-block-soft',
  'skeleton-block-soft',
];

const LIST_SURFACE_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: NAV_FADE_TRANSITION },
  exit: { opacity: 0, transition: NAV_MICRO_TRANSITION },
});

const LIST_SURFACE_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0, y: 8 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...NAV_MICRO_TRANSITION,
      delay: Math.min(Math.max(index, 0) * 0.04, 0.24),
    },
  }),
  exit: { opacity: 0, y: -4, transition: NAV_MICRO_TRANSITION },
});

function getPreviewImage(item) {
  return (
    getPreferredMoviePosterSrc(item, 'w342') ||
    item?.poster_path_full ||
    (item?.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null)
  );
}

function getChangedListIds(lists, initialMemberships, draftMemberships) {
  return lists
    .map((list) => list.id)
    .filter((id) => Boolean(initialMemberships[id]) !== Boolean(draftMemberships[id]));
}

function handleListWheel(event) {
  const listViewport = event.currentTarget;

  if (listViewport.scrollHeight <= listViewport.clientHeight) return;

  event.preventDefault();
  event.stopPropagation();

  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

// --- SUB-COMPONENTS ---

const ListPreviewStack = memo(function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  if (previewItems.length === 0) {
    return (
      <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] border border-dashed border-white/10 bg-black text-white/50">
        <Icon icon="solar:list-bold" size={20} />
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
            className="border-primary absolute bottom-0 overflow-hidden border bg-black"
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
                wrapperClassName="h-full w-full "
              />
            ) : (
              <div className="center h-full w-full bg-white/5 text-white/50">
                <Icon icon="solar:videocamera-record-bold" size={16} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

const ListRow = memo(function ListRow({ list, isSelected, onToggle, index }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      variants={LIST_SURFACE_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: NAV_TAP_SCALE }}
      className={cn(
        'group flex w-full items-center gap-2 border p-3 text-left transition-[background-color,border-color,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        isSelected
          ? 'border-white/10 bg-white/5'
          : 'border-white/5 hover:border-white/10 hover:bg-white/5',
      )}
    >
      <ListPreviewStack list={list} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{list.title}</p>
        {list.description && (
          <p className="line-clamp-2 text-sm leading-snug text-white/70">{list.description}</p>
        )}
      </div>

      <span
        className={cn(
          'flex size-[22px] shrink-0 items-center justify-center border',
          isSelected
            ? 'border-info bg-info text-primary'
            : 'border-white/5 text-white/50 group-hover:border-white/50 group-hover:text-white/70',
        )}
      >
        <Icon icon="material-symbols:check-rounded" size={16} />
      </span>
    </motion.button>
  );
});

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex h-24 items-center gap-2 border border-white/5 p-3"
        >
          <div className="relative h-[68px] w-[82px] shrink-0">
            {[0, 1, 2, 3].map((stackIndex) => (
              <div
                key={`stack-${index}-${stackIndex}`}
                className={cn(
                  'absolute bottom-0 overflow-hidden border border-white/5',
                  STACK_SKELETON_CLASSES[stackIndex] || 'skeleton-block-soft',
                )}
                style={{
                  position: 'absolute',
                  width: '46px',
                  height: `${68 - stackIndex * 6}px`,
                  left: `${stackIndex * 12}px`,
                  zIndex: 4 - stackIndex,
                }}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="skeleton-block h-4 w-2/5" />
            <div className="skeleton-block-soft h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- MAIN COMPONENT ---

export function createListPickerSurfaceEntry(data = {}, config = {}) {
  return {
    component: ListPickerSurface,
    icon: 'solar:folder-open-bold',
    title: 'Your Lists',
    description: 'Choose lists for this title',
    props: { data },
    ...config,
  };
}

export default function ListPickerSurface({ close, data }) {
  const { openSurface } = useNavigationActions();
  const toast = useToast();
  const userId = data?.userId ?? null;
  const media = data?.media ?? null;
  const isAuthSessionReady = useAuthSessionReady(userId);

  const [lists, setLists] = useState([]);
  const [initialMemberships, setInitialMemberships] = useState({});
  const [draftMemberships, setDraftMemberships] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  const pendingListIds = getChangedListIds(lists, initialMemberships, draftMemberships);
  const hasPendingChanges = pendingListIds.length > 0;

  useEffect(() => {
    if (!userId || !isAuthSessionReady) {
      setLists([]);
      setIsLoading(!isAuthSessionReady && Boolean(userId));
      return;
    }

    setIsLoading(true);
    return subscribeToUserLists(
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
      },
    );
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
          listIds: lists.map((l) => l.id),
        });
        if (!cancelled) {
          setInitialMemberships(memberships);
          setDraftMemberships(memberships);
        }
      } catch (error) {
        if (!cancelled) toast.error(error?.message || 'List memberships could not be loaded');
      }
    }
    loadMemberships();
    return () => {
      cancelled = true;
    };
  }, [userId, isAuthSessionReady, media, lists, toast]);

  const handleOpenCreator = () => {
    openSurface(createCreateListSurfaceEntry({ media }));
  };
  const handleToggleDraft = (listId) =>
    setDraftMemberships((prev) => ({ ...prev, [listId]: !prev[listId] }));

  const handleApplyChanges = async () => {
    if (isApplying || !userId || !media || !hasPendingChanges) return;
    setIsApplying(true);

    const nextMemberships = { ...initialMemberships };
    const successfulListIds = [];
    const failedListTitles = [];

    for (const listId of pendingListIds) {
      const targetState = Boolean(draftMemberships[listId]);
      const targetList = lists.find((l) => l.id === listId);
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
      successfulListIds.forEach((id) => {
        next[id] = nextMemberships[id];
      });
      return next;
    });
    setIsApplying(false);

    if (failedListTitles.length > 0) {
      if (successfulListIds.length > 0) {
        toast.warning(
          `${successfulListIds.length} changes applied, ${failedListTitles.length} failed.`,
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
  };

  return (
    <div className="flex max-h-[min(72dvh,40rem)] w-full flex-col gap-2 overflow-hidden">
      <motion.div
        variants={LIST_SURFACE_VARIANTS}
        initial="hidden"
        animate="visible"
        className={cn(
          'min-h-0 overflow-y-auto overscroll-y-contain',
          (isLoading || lists.length > 4) && 'h-[400px] shrink-0',
        )}
        onWheel={handleListWheel}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : lists.length === 0 ? (
          <div className="center min-h-52 flex-col gap-2 text-center">
            <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">
              No lists yet
            </p>
            <p className="text-sm text-white/70">Create your first list with the button above.</p>
          </div>
        ) : (
          <motion.div
            variants={LIST_SURFACE_VARIANTS}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2 overflow-visible"
          >
            {lists.map((list, index) => (
              <ListRow
                key={list.id}
                index={index}
                list={list}
                isSelected={Boolean(draftMemberships[list.id])}
                onToggle={() => handleToggleDraft(list.id)}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={handleOpenCreator}
          disabled={isApplying}
          className={getNavActionClass({ className: 'w-full' })}
        >
          <span>Create List</span>
        </button>
        <button
          type="button"
          onClick={handleApplyChanges}
          disabled={isApplying || !hasPendingChanges}
          className={getNavActionClass({
            variant: INFO_ACTION_TONE_CLASS,
            className: 'w-full disabled:cursor-not-allowed disabled:opacity-50',
          })}
        >
          {isApplying ? 'Applying' : 'Apply changes'}
        </button>
      </div>
    </div>
  );
}
