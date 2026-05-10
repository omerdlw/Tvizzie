'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useModalActions } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserListWithItems } from '@/core/services/media/lists.service';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { cn, formatYear } from '@/core/utils';
import {
  MODAL_ACTION_BUTTON_PRIMARY_CLASS,
  MODAL_ACTION_BUTTON_SECONDARY_CLASS,
  MODAL_EMPTY_PANEL_CLASS,
  MODAL_INPUT_CLASSNAMES,
  MODAL_SCROLLABLE_BODY_CLASS,
} from '@/features/modals/constants';
import { FEATURE_MODAL_EMPTY_MOTION, getFeatureModalItemMotion, getFeatureModalSectionMotion } from '@/features/motion';

import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';

function normalizeSearchResult(item = {}) {
  const mediaType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();

  if (mediaType !== 'movie') {
    return null;
  }

  const id = String(item?.id ?? item?.entityId ?? '').trim();

  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();

  if (!id || (!title && !name)) {
    return null;
  }

  return {
    id,
    entityId: id,
    media_type: mediaType,
    entityType: mediaType,

    title,
    name,

    poster_path: item?.poster_path || item?.posterPath || null,
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,

    release_date: item?.release_date || null,

    genre_ids: Array.isArray(item?.genre_ids) ? item.genre_ids : Array.isArray(item?.genreIds) ? item.genreIds : [],

    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,

    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,

    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

function getMediaKey(item) {
  return `${item?.entityType || item?.media_type}-${item?.entityId || item?.id}`;
}

function getMediaTitle(item) {
  return item?.title || item?.name || 'Untitled';
}

function getMediaYear(item) {
  return formatYear(item?.release_date);
}

function MediaMeta({ item }) {
  const title = getMediaTitle(item);
  const year = getMediaYear(item);

  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-white">{title}</p>

      {year !== 'N/A' && <p className="text-[11px] font-medium text-white/50">{year}</p>}
    </div>
  );
}

function SearchResultRow({ item, isAdded, onAdd }) {
  return (
    <button
      type="button"
      disabled={isAdded}
      onClick={() => onAdd(item)}
      className={cn(
        'group flex w-full items-center gap-2 border px-3 py-2.5 text-left',
        isAdded
          ? 'cursor-default border-white/5 bg-white/5'
          : 'cursor-pointer border-white/5 hover:border-white/10 hover:bg-white/5'
      )}
    >
      <MediaMeta item={item} />

      <span
        className={cn(
          'center size-6 shrink-0 border',
          isAdded
            ? 'border-info bg-info text-white'
            : 'border-white/5 text-white/70 group-hover:border-white/10 group-hover:text-white'
        )}
      >
        <Icon icon={isAdded ? 'material-symbols:check-rounded' : 'material-symbols:add-rounded'} size={16} />
      </span>
    </button>
  );
}

function DraftItemRow({ index, item, onRemove }) {
  const title = getMediaTitle(item);

  return (
    <div className="group flex items-center gap-2 border border-white/5 px-3 py-2 hover:border-white/10">
      <span className="w-5 text-center text-[11px] font-bold tracking-widest text-white/50">{index + 1}</span>

      <MediaMeta item={item} />

      <Button
        variant="destructive-icon"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${title}`}
        className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Icon icon="material-symbols:close-rounded" size={16} />
      </Button>
    </div>
  );
}

export default function CreateListModal({ close, data }) {
  const auth = useAuth();
  const router = useRouter();

  const toast = useToast();
  const { closeAllModals } = useModalActions();

  const seedMedia = data?.media ?? null;

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const [draftItems, setDraftItems] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [, startSearchTransition] = useTransition();

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = useMemo(() => new Set(draftItems.map(getMediaKey)), [draftItems]);

  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;

  const hasSearchResults = searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);

  useEffect(() => {
    if (!seedMedia) {
      return;
    }

    const normalized = normalizeSearchResult(seedMedia);

    if (!normalized) {
      return;
    }

    setDraftItems((current) => {
      const exists = current.some((item) => getMediaKey(item) === getMediaKey(normalized));

      if (exists) {
        return current;
      }

      return [...current, normalized];
    });
  }, [seedMedia]);

  useEffect(() => {
    if (deferredSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);

      return;
    }

    let ignore = false;

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await TmdbService.searchContent(deferredSearchQuery, 'movie', 1);

        const results = (response?.data?.results || []).map(normalizeSearchResult).filter(Boolean);

        if (!ignore) {
          startSearchTransition(() => {
            setSearchResults(results);
          });
        }
      } catch {
        if (!ignore) {
          setSearchResults([]);
        }
      } finally {
        if (!ignore) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchQuery, startSearchTransition]);

  const handleAdd = useCallback((item) => {
    const key = getMediaKey(item);

    setDraftItems((current) => {
      const exists = current.some((existing) => getMediaKey(existing) === key);

      if (exists) {
        return current;
      }

      return [...current, item];
    });
  }, []);

  const handleRemove = useCallback((item) => {
    const key = getMediaKey(item);

    setDraftItems((current) => current.filter((existing) => getMediaKey(existing) !== key));
  }, []);

  const handleQuickAdd = useCallback(() => {
    if (!searchResults.length) {
      return;
    }

    handleAdd(searchResults[0]);

    setSearchQuery('');
    setSearchResults([]);
  }, [handleAdd, searchResults]);

  const handleSubmit = useCallback(async () => {
    if (isSaving || !canSubmit) {
      return;
    }

    if (!auth.user?.id) {
      toast.error('You must be signed in to create a list');
      return;
    }

    setIsSaving(true);

    try {
      const nextList = await createUserListWithItems({
        title: draftTitle,
        description: draftDescription,
        items: draftItems,
        userId: auth.user.id,
      });

      closeAllModals({
        success: true,
        list: nextList,
      });

      const ownerHandle = nextList?.ownerSnapshot?.username;

      if (ownerHandle && nextList?.slug) {
        router.push(`/account/${ownerHandle}/lists/${nextList.slug}`);
      }
    } catch (error) {
      toast.error(error?.message || 'The list could not be created');
    } finally {
      setIsSaving(false);
    }
  }, [auth.user?.id, canSubmit, closeAllModals, draftDescription, draftItems, draftTitle, isSaving, router, toast]);

  return (
    <Container
      close={close}
      header={false}
      className="max-h-[72dvh] w-full sm:w-[520px]"
      bodyClassName="flex overflow-hidden p-2"
      footer={{
        left: (
          <span className="text-xs text-white/50">
            {draftItems.length} {draftItems.length === 1 ? 'title' : 'titles'}
          </span>
        ),

        right: (
          <>
            <Button
              type="button"
              onClick={close}
              disabled={isSaving}
              className={MODAL_ACTION_BUTTON_SECONDARY_CLASS}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !canSubmit}
              className={MODAL_ACTION_BUTTON_PRIMARY_CLASS}
            >
              {isSaving ? 'Creating' : 'Create List'}
            </Button>
          </>
        ),
      }}
    >
      <motion.div className="flex min-h-0 flex-1 flex-col gap-2" {...getFeatureModalSectionMotion(0)}>
        <motion.div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" {...getFeatureModalSectionMotion(1)}>
          <Input
            autoFocus
            value={draftTitle}
            placeholder="List title"
            onChange={(event) => setDraftTitle(event.target.value)}
            className={MODAL_INPUT_CLASSNAMES}
          />

          <Input
            value={draftDescription}
            placeholder="Description (optional)"
            onChange={(event) => setDraftDescription(event.target.value)}
            className={MODAL_INPUT_CLASSNAMES}
          />
        </motion.div>

        <motion.div {...getFeatureModalSectionMotion(2)}>
          <Input
            value={searchQuery}
            placeholder="Search movies to add"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleQuickAdd();
              }
            }}
            leftIcon={<Icon icon="solar:magnifer-linear" size={16} className="text-white/50" />}
            rightIcon={isSearching ? <Icon icon="solar:spinner-bold" size={16} className="text-white/50" /> : null}
            className={{
              ...MODAL_INPUT_CLASSNAMES,
              leftIcon: 'flex shrink-0 items-center pr-2.5',
              rightIcon: 'flex shrink-0 items-center pl-2.5',
            }}
          />
        </motion.div>

        <motion.div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className={MODAL_SCROLLABLE_BODY_CLASS}
          {...getFeatureModalSectionMotion(3)}
        >
          {hasSearchResults ? (
            <>
              {searchResults.map((item, index) => (
                <motion.div key={getMediaKey(item)} {...getFeatureModalItemMotion(index)}>
                  <SearchResultRow item={item} onAdd={handleAdd} isAdded={selectedKeys.has(getMediaKey(item))} />
                </motion.div>
              ))}

              {isSearching && searchResults.length === 0 && (
                <motion.div {...FEATURE_MODAL_EMPTY_MOTION}>
                  <div className="text-white-soft flex h-20 items-center justify-center text-sm">Searching</div>
                </motion.div>
              )}
            </>
          ) : (
            <>
              {draftItems.length > 0 && (
                <p className="px-1 text-[10px] font-bold tracking-widest text-white/50 uppercase">Draft</p>
              )}

              {draftItems.length > 0 ? (
                draftItems.map((item, index) => (
                  <motion.div key={getMediaKey(item)} {...getFeatureModalItemMotion(index)}>
                    <DraftItemRow index={index} item={item} onRemove={handleRemove} />
                  </motion.div>
                ))
              ) : (
                <motion.div {...FEATURE_MODAL_EMPTY_MOTION}>
                  <div className={cn(MODAL_EMPTY_PANEL_CLASS, 'border-dashed')}>
                    <Icon icon="solar:list-bold" size={24} />
                    <p className="text-xs">Search movies above to start building your list</p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </Container>
  );
}
