'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/core/modules/auth';
import Container from '@/core/modules/modal/container';
import { useModalActions } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserListWithItems } from '@/core/services/media/lists.service';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { cn, formatYear } from '@/core/utils';
import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';

const ACTION_BUTTON_CLASS =
  'h-8 shrink-0 rounded border border-white/10 px-4 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition';

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();

  if (entityType !== 'movie') {
    return null;
  }

  const entityId = String(item?.id ?? item?.entityId ?? '').trim();
  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();

  if (!entityId || (!title && !name)) {
    return null;
  }

  return {
    backdrop_path: item?.backdrop_path || item?.backdropPath || null,
    entityId,
    entityType,
    genre_ids: Array.isArray(item?.genre_ids) ? item.genre_ids : Array.isArray(item?.genreIds) ? item.genreIds : [],
    id: entityId,
    media_type: entityType,
    name,
    popularity: Number.isFinite(Number(item?.popularity)) ? Number(item.popularity) : null,
    poster_path: item?.poster_path || item?.posterPath || null,
    release_date: item?.release_date || null,
    title,
    vote_average: Number.isFinite(Number(item?.vote_average)) ? Number(item.vote_average) : null,
    vote_count: Number.isFinite(Number(item?.vote_count)) ? Number(item.vote_count) : null,
  };
}

function getDraftMediaKey(item) {
  return `${item?.entityType || item?.media_type}-${item?.entityId || item?.id}`;
}

function getItemDisplayTitle(item) {
  return item?.title || item?.name || 'Untitled';
}

function getItemYear(item) {
  return formatYear(item?.release_date);
}

function SearchResultRow({ item, isAdded, onAdd }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);

  return (
    <button
      type="button"
      disabled={isAdded}
      onClick={() => onAdd(item)}
      className={cn(
        'group flex w-full items-center gap-3 rounded border px-3 py-2.5 text-left transition-all',
        isAdded
          ? 'cursor-default border-white/10 bg-white/10 opacity-70'
          : 'cursor-pointer border-white/10 hover:border-white/15 hover:bg-white/10'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {year !== 'N/A' && <p className="text-[11px] font-medium text-white/50">{year}</p>}
      </div>

      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-xs border transition-all',
          isAdded
            ? 'border-info bg-info text-black'
            : 'border-white/10 text-white/50 group-hover:border-white/15 group-hover:text-white'
        )}
      >
        <Icon icon={isAdded ? 'material-symbols:check-rounded' : 'material-symbols:add-rounded'} size={16} />
      </span>
    </button>
  );
}

function DraftItemRow({ index, item, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);

  return (
    <div className="group bg-primary flex items-center gap-3 rounded border border-white/10 px-3 py-2 transition-all hover:border-white/10">
      <span className="w-5 text-center text-[11px] font-bold tracking-widest text-white/50">{index + 1}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {year !== 'N/A' && <p className="text-[11px] font-medium text-white/50">{year}</p>}
      </div>

      <Button
        variant="destructive-icon"
        onClick={() => onRemove(item)}
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="material-symbols:close-rounded" size={16} />
      </Button>
    </div>
  );
}

export default function CreateListModal({ close, data }) {
  const auth = useAuth();
  const { closeAllModals } = useModalActions();
  const toast = useToast();
  const router = useRouter();

  const seedMedia = data?.media ?? null;

  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftItems, setDraftItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  const selectedKeys = useMemo(() => new Set(draftItems.map((item) => getDraftMediaKey(item))), [draftItems]);

  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;
  const showSearchResults = searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);

  useEffect(() => {
    if (!seedMedia) return;

    const normalized = normalizeSearchResult(seedMedia);
    if (!normalized) return;

    setDraftItems((current) => {
      const key = getDraftMediaKey(normalized);
      if (current.some((item) => getDraftMediaKey(item) === key)) return current;
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
    const key = getDraftMediaKey(item);
    setDraftItems((current) => {
      if (current.some((existing) => getDraftMediaKey(existing) === key)) return current;
      return [...current, item];
    });
  }, []);

  const handleRemove = useCallback((item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((current) => current.filter((existing) => getDraftMediaKey(existing) !== key));
  }, []);

  const handleQuickAdd = useCallback(() => {
    if (!searchResults.length) return;
    handleAdd(searchResults[0]);
    setSearchQuery('');
    setSearchResults([]);
  }, [handleAdd, searchResults]);

  const handleSubmit = useCallback(async () => {
    if (isSaving || !canSubmit) return;

    if (!auth.user?.id) {
      toast.error('You must be signed in to create a list');
      return;
    }

    setIsSaving(true);

    try {
      const nextList = await createUserListWithItems({
        description: draftDescription,
        items: draftItems,
        title: draftTitle,
        userId: auth.user.id,
      });

      closeAllModals({ success: true, list: nextList });

      const ownerHandle = nextList?.ownerSnapshot?.username;

      if (ownerHandle && nextList?.slug) {
        router.push(`/account/${ownerHandle}/lists/${nextList.slug}`);
      }
    } catch (error) {
      toast.error(error?.message || 'The list could not be created');
    } finally {
      setIsSaving(false);
    }
  }, [auth.user?.id, canSubmit, close, draftDescription, draftItems, draftTitle, isSaving, router, toast]);

  return (
    <Container
      className="max-h-[72dvh] w-full sm:w-[520px]"
      header={false}
      close={close}
      bodyClassName="flex overflow-hidden p-3"
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
              className={`${ACTION_BUTTON_CLASS} text-white/70 hover:bg-white/10 hover:text-white`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !canSubmit}
              className="hover:bg-info hover:border-info hover:text-primary h-8 rounded border border-white bg-white px-4 text-xs font-semibold tracking-wide text-black uppercase transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/50"
            >
              {isSaving ? 'Creating' : 'Create List'}
            </Button>
          </>
        ),
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="List title"
            autoFocus
            className={{
              wrapper:
                'flex h-10 items-center rounded border border-white/10 bg-white/10 px-3.5 transition focus-within:border-white/20',
              input: 'h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50',
            }}
          />
          <Input
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            placeholder="Description (optional)"
            className={{
              wrapper:
                'flex h-10 items-center rounded border border-white/10 bg-white/10 px-3.5 transition focus-within:border-white/20',
              input: 'h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50',
            }}
          />
        </div>

        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleQuickAdd();
            }
          }}
          placeholder="Search movies to add"
          leftIcon={<Icon icon="solar:magnifer-linear" size={16} className="text-white/50" />}
          rightIcon={
            isSearching ? <Icon icon="solar:spinner-bold" size={16} className="animate-spin text-white/50" /> : null
          }
          className={{
            wrapper:
              'flex h-10 items-center rounded border border-white/10 bg-white/10 px-3.5 transition focus-within:border-white/20',
            input: 'h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50',
            leftIcon: 'flex shrink-0 items-center pr-2.5',
            rightIcon: 'flex shrink-0 items-center pl-2.5',
          }}
        />

        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]"
        >
          {showSearchResults ? (
            <>
              {searchResults.map((item) => (
                <SearchResultRow
                  key={getDraftMediaKey(item)}
                  item={item}
                  isAdded={selectedKeys.has(getDraftMediaKey(item))}
                  onAdd={handleAdd}
                />
              ))}
              {isSearching && searchResults.length === 0 && (
                <div className="flex h-20 items-center justify-center text-sm text-white/70">Searching</div>
              )}
            </>
          ) : (
            <>
              {draftItems.length > 0 && (
                <p className="px-1 text-[10px] font-bold tracking-widest text-white/50 uppercase">Draft</p>
              )}
              {draftItems.length > 0 ? (
                draftItems.map((item, index) => (
                  <DraftItemRow key={getDraftMediaKey(item)} index={index} item={item} onRemove={handleRemove} />
                ))
              ) : (
                <div className="flex h-28 flex-col items-center justify-center gap-2 rounded border border-white/10 bg-white/10 text-center">
                  <Icon icon="solar:list-bold" size={24} className="text-white/50" />
                  <p className="text-xs text-white/50">Search movies above to start building your list</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
