'use client';

import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';

import { TMDB_IMG } from '@/shared/constants';
import { useAuthSessionReady } from '@/modules/auth';
import {
  Container,
  CANCEL_BUTTON_CLASS,
  ACTION_BUTTON_CLASS,
  useModalActions,
} from '@/modules/modal';
import { useToast } from '@/modules/notification';
import {
  getUserListMemberships,
  subscribeToUserLists,
  toggleUserListItem,
} from '@/domains/media/server/lists';
import { cn } from '@/shared/utils';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';

// --- CONSTANTS & HELPERS ---

const STACK_SKELETON_BG = ['#f8f8f8', '#f3f3f3', '#efefef', '#ebebeb'];

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

// --- SUB-COMPONENTS ---

const ListPreviewStack = memo(function ListPreviewStack({ list }) {
  usePosterPreferenceVersion();
  const previewItems = Array.isArray(list?.previewItems) ? list.previewItems.slice(0, 4) : [];

  if (previewItems.length === 0) {
    return (
      <div className="center absolute bottom-0 left-0 h-[68px] w-[46px] rounded-[8px] border border-dashed border-black/10 bg-white text-black/50">
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
                className="h-full w-full rounded-[8px] object-cover"
                wrapperClassName="h-full w-full rounded-[8px]"
              />
            ) : (
              <div className="center bg-primary h-full w-full text-black/50">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.24, 1], delay: Math.min(index * 0.02, 0.12) }}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'group flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-colors duration-200',
        isSelected
          ? 'bg-info/10 border-info/20'
          : 'hover:bg-primary border-black/5 hover:border-black/10',
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
          'mr-1.5 flex size-[22px] shrink-0 items-center justify-center rounded-[10px] border',
          isSelected
            ? 'border-info bg-info text-primary'
            : 'border-black/5 text-black/50 group-hover:border-black/50 group-hover:text-black/70',
        )}
      >
        <Icon icon="material-symbols:check-rounded" size={16} />
      </span>
    </motion.button>
  );
});

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex h-24 items-center gap-4 rounded-xl border border-black/5 p-3"
        >
          <div className="relative h-[68px] w-[82px] shrink-0">
            {[0, 1, 2, 3].map((stackIndex) => (
              <div
                key={`stack-${index}-${stackIndex}`}
                className="absolute bottom-0 overflow-hidden rounded-[8px] border border-black/5"
                style={{
                  backgroundColor:
                    STACK_SKELETON_BG[stackIndex] ||
                    STACK_SKELETON_BG[STACK_SKELETON_BG.length - 1],
                  width: '46px',
                  height: `${68 - stackIndex * 6}px`,
                  left: `${stackIndex * 12}px`,
                  zIndex: 4 - stackIndex,
                }}
              />
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

// --- MAIN COMPONENT ---

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

  const selectedCount = lists.filter((list) => Boolean(draftMemberships[list.id])).length;
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

  const handleOpenCreator = () => openModal('CREATE_LIST_MODAL', undefined, { data: { media } });
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
    <Container
      className="max-h-[72dvh] w-full sm:w-[660px]"
      header={{
        left: (
          <h2 className="text-[11px] font-bold tracking-widest text-black/50 uppercase">
            Your lists
          </h2>
        ),
        right: (
          <div className="overflow-visible p-0.5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              onClick={handleOpenCreator}
              disabled={isApplying}
              className={CANCEL_BUTTON_CLASS}
            >
              Create new list
            </motion.button>
          </div>
        ),
      }}
      close={close}
      bodyClassName="p-4"
      footer={{
        left: (
          <span className="text-xs text-black/70">
            {selectedCount} selected • {pendingListIds.length} pending
          </span>
        ),
        right: (
          <div className="flex items-center gap-2 overflow-visible p-0.5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              onClick={close}
              disabled={isApplying}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              whileHover={isApplying || !hasPendingChanges ? undefined : { scale: 1.012 }}
              whileTap={isApplying || !hasPendingChanges ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              onClick={handleApplyChanges}
              disabled={isApplying || !hasPendingChanges}
              className={ACTION_BUTTON_CLASS}
            >
              {isApplying ? 'Applying' : 'Apply changes'}
            </motion.button>
          </div>
        ),
      }}
    >
      <section className="flex min-h-0 flex-col gap-3">
        <div className="max-h-[56dvh] min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <LoadingSkeleton />
          ) : lists.length === 0 ? (
            <div className="center min-h-52 flex-col text-center">
              <p className="text-[11px] font-bold tracking-widest text-black/50 uppercase">
                No lists yet
              </p>
              <p className="mt-1 text-sm text-black/70">
                Create your first list with the button above.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-visible p-1">
              {lists.map((list, index) => (
                <ListRow
                  key={list.id}
                  index={index}
                  list={list}
                  isSelected={Boolean(draftMemberships[list.id])}
                  onToggle={() => handleToggleDraft(list.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Container>
  );
}
