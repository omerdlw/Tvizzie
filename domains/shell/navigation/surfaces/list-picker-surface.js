'use client';

import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { INFO_ACTION_TONE_CLASS } from '@/shared/constants';
import { useAuthSessionReady } from '@/modules/auth';
import { useNavigationActions } from '@/modules/nav';
import { NAV_TAP_SCALE } from '@/modules/nav/motion';
import { useToast } from '@/modules/notification';
import {
  getUserListMemberships,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/domains/account/client/lists';
import { createCreateListSurfaceEntry } from './list-create-surface';
import { cn } from '@/ui/class-names';
import { getNavActionClass } from '@/modules/nav/action-styles';
import Icon from '@/ui/primitives/icon';
import { ListPickerSkeleton } from '@/domains/shell/ui/skeletons';
import {
  SURFACE_LIST_VARIANTS,
  SURFACE_LIST_ITEM_VARIANTS,
  getChangedListIds,
  handleListWheel,
  ListPreviewStack,
} from './list-primitives';

// --- SUB-COMPONENTS ---

const ListRow = memo(function ListRow({ list, isSelected, onToggle, index }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      variants={SURFACE_LIST_ITEM_VARIANTS}
      custom={index}
      initial="hidden"
      animate="visible"
      whileTap={{ scale: NAV_TAP_SCALE }}
      className={cn(
        'group flex w-full items-center gap-2 border p-3 text-left transition-all duration-300 ease-in-out',
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

    toast.success('Lists updated successfully.');
    close({
      memberships: nextMemberships,
      selectedListIds: Object.keys(nextMemberships).filter((id) => Boolean(nextMemberships[id])),
    });
  };

  return (
    <div className="flex max-h-[min(72dvh,40rem)] w-full flex-col gap-2 overflow-hidden">
      <motion.div
        variants={SURFACE_LIST_VARIANTS}
        initial="hidden"
        animate="visible"
        className={cn(
          'min-h-0 overflow-y-auto overscroll-y-contain',
          (isLoading || lists.length > 4) && 'h-[400px] shrink-0',
        )}
        onWheel={handleListWheel}
      >
        {isLoading ? (
          <ListPickerSkeleton />
        ) : lists.length === 0 ? (
          <div className="center min-h-52 flex-col gap-2 text-center">
            <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">
              No lists yet
            </p>
            <p className="text-sm text-white/70">Create your first list with the button above.</p>
          </div>
        ) : (
          <motion.div
            variants={SURFACE_LIST_VARIANTS}
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
