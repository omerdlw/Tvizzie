'use client';

import { useDeferredValue, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/modules/auth';
import Container, { CANCEL_BUTTON_CLASS, ACTION_BUTTON_CLASS } from '@/core/modules/modal/container';
import { useModalActions } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { createUserListWithItems } from '@/core/services/media/lists';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import { cn, formatYear } from '@/core/utils';
import { Button, Input } from '@/ui/elements';
import Icon from '@/ui/icon';
import { AnimatePresence, motion } from 'framer-motion';

const listSpringTransition = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 28,
  mass: 0.8,
});

const listButtonSpring = Object.freeze({
  type: 'spring',
  stiffness: 450,
  damping: 24,
  mass: 0.6,
});

const listButtonTap = Object.freeze({});

const listInputMotion = Object.freeze({});

function getMovieRowAnimation(index = 0) {
  return Object.freeze({
    initial: Object.freeze({ opacity: 0, y: 4 }),
    animate: Object.freeze({ opacity: 1, y: 0 }),
    exit: Object.freeze({ opacity: 0, y: -4 }),
    transition: Object.freeze({
      opacity: { duration: 0.16 },
      y: { type: 'spring', stiffness: 350, damping: 30, delay: Math.min(index * 0.015, 0.1) },
    }),
  });
}

const MotionButton = motion(Button);

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------



// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalizeSearchResult(item = {}) {
  const entityType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();
  if (entityType !== 'movie' && entityType !== 'tv') return null;
  const entityId = String(item?.id ?? item?.entityId ?? '').trim();
  const title = String(item?.title || item?.original_title || '').trim();
  const name = String(item?.name || item?.original_name || '').trim();
  if (!entityId || (!title && !name)) return null;
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
    first_air_date: item?.first_air_date || null,
    release_date: item?.release_date || null,
    title: title || name,
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
  return formatYear(item?.release_date || item?.first_air_date);
}

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function CreateListModal({ close, data }) {
  const auth = useAuth();
  const { closeAllModals } = useModalActions();
  const toast = useToast();
  const router = useRouter();
  const seedMedia = data?.media ?? null;

  // States
  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftItems, setDraftItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startSearchTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  // Derived Values
  const selectedKeys = new Set(draftItems.map((item) => getDraftMediaKey(item)));
  const canSubmit = Boolean(draftTitle.trim()) && draftItems.length > 0;
  const showSearchResults = searchResults.length > 0 || (deferredSearchQuery.length >= 2 && isSearching);

  // Effects
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
        const [movieResponse, tvResponse] = await Promise.all([
          TmdbService.searchContent(deferredSearchQuery, 'movie', 1),
          TmdbService.searchContent(deferredSearchQuery, 'tv', 1),
        ]);
        const results = [...(movieResponse?.data?.results || []), ...(tvResponse?.data?.results || [])]
          .map(normalizeSearchResult)
          .filter(Boolean);
        if (!ignore) {
          startSearchTransition(() => setSearchResults(results));
        }
      } catch {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 200);
    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchQuery, startSearchTransition]);

  // Handlers
  const handleAdd = (item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((current) => {
      if (current.some((existing) => getDraftMediaKey(existing) === key)) return current;
      return [...current, item];
    });
  };
  const handleRemove = (item) => {
    const key = getDraftMediaKey(item);
    setDraftItems((current) => current.filter((existing) => getDraftMediaKey(existing) !== key));
  };
  const handleQuickAdd = () => {
    if (!searchResults.length) return;
    handleAdd(searchResults[0]);
    setSearchQuery('');
    setSearchResults([]);
  };
  const handleSubmit = async () => {
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
  };
  return (
    <ModalView
      close={close}
      draftTitle={draftTitle}
      setDraftTitle={setDraftTitle}
      draftDescription={draftDescription}
      setDraftDescription={setDraftDescription}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={searchResults}
      isSearching={isSearching}
      showSearchResults={showSearchResults}
      draftItems={draftItems}
      selectedKeys={selectedKeys}
      isSaving={isSaving}
      canSubmit={canSubmit}
      handleAdd={handleAdd}
      handleRemove={handleRemove}
      handleQuickAdd={handleQuickAdd}
      handleSubmit={handleSubmit}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({
  close,
  draftTitle,
  setDraftTitle,
  draftDescription,
  setDraftDescription,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  showSearchResults,
  draftItems,
  selectedKeys,
  isSaving,
  canSubmit,
  handleAdd,
  handleRemove,
  handleQuickAdd,
  handleSubmit,
}) {
  return (
    <Container
      className="max-h-[72dvh] w-full sm:w-[520px]"
      header={false}
      close={close}
      bodyClassName="flex overflow-hidden p-3"
      footer={{
        left: (
          <span className="text-xs text-black/50">
            {draftItems.length} {draftItems.length === 1 ? 'title' : 'titles'}
          </span>
        ),
        right: (
          <>
            <MotionButton
              type="button"
              onClick={close}
              disabled={isSaving}
              {...listButtonTap}
              className={CANCEL_BUTTON_CLASS}
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !canSubmit}
              {...listButtonTap}
              className={ACTION_BUTTON_CLASS}
            >
              {isSaving ? 'Creating' : 'Create List'}
            </MotionButton>
          </>
        ),
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <motion.div {...listInputMotion}>
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="List title"
              autoFocus
              className={{
                wrapper:
                  'flex h-10 items-center rounded-[10px] border border-black/5 bg-black/5 px-3.5 transition-all duration-300 ease-out focus-within:border-black/15',
                input:
                  'h-full w-full rounded-[10px] bg-transparent text-sm text-black outline-none placeholder:text-black/50',
              }}
            />
          </motion.div>
          <motion.div {...listInputMotion}>
            <Input
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="Description (optional)"
              className={{
                wrapper:
                  'flex h-10 items-center rounded-[10px] border border-black/5 bg-black/5 px-3.5 transition-all duration-300 ease-out focus-within:border-black/15',
                input:
                  'h-full w-full rounded-[10px] bg-transparent text-sm text-black outline-none placeholder:text-black/50',
              }}
            />
          </motion.div>
        </div>

        <motion.div {...listInputMotion}>
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
            leftIcon={<Icon icon="solar:magnifer-linear" size={16} className="text-black/50" />}
            rightIcon={isSearching ? <Icon icon="solar:spinner-bold" size={16} className="text-black/50 animate-spin" /> : null}
            className={{
              wrapper:
                'flex h-10 items-center rounded-[10px] border border-black/5 bg-black/5 px-3.5 transition-all duration-300 ease-out focus-within:border-black/15',
              input:
                'h-full w-full rounded-[10px] bg-transparent text-sm text-black outline-none placeholder:text-black/50',
              leftIcon: 'flex shrink-0 items-center pr-2.5',
              rightIcon: 'flex shrink-0 items-center pl-2.5',
            }}
          />
        </motion.div>

        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]"
        >
          {showSearchResults ? (
            <AnimatePresence mode="popLayout">
              {searchResults.map((item, index) => (
                <SearchResultRow
                  key={getDraftMediaKey(item)}
                  index={index}
                  item={item}
                  isAdded={selectedKeys.has(getDraftMediaKey(item))}
                  onAdd={handleAdd}
                />
              ))}
              {isSearching && searchResults.length === 0 && (
                <div className="flex h-20 items-center justify-center text-sm text-black/70">Searching</div>
              )}
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="popLayout">
              {draftItems.length > 0 && (
                <motion.p
                  key="draft-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-1 text-[10px] font-bold tracking-widest text-black/50 uppercase"
                >
                  Draft
                </motion.p>
              )}
              {draftItems.length > 0 ? (
                draftItems.map((item, index) => (
                  <DraftItemRow key={getDraftMediaKey(item)} index={index} item={item} onRemove={handleRemove} />
                ))
              ) : (
                <motion.div
                  key="empty-draft"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-28 flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-black/10 bg-black/5 text-center"
                >
                  <Icon icon="solar:list-bold" size={24} className="text-black/50" />
                  <p className="text-xs text-black/50">Search movies above to start building your list</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </Container>
  );
}
function SearchResultRow({ item, isAdded, onAdd, index }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  return (
    <motion.button
      type="button"
      disabled={isAdded}
      onClick={() => onAdd(item)}
      {...getMovieRowAnimation(index)}
      layout
      className={cn(
        'group flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-all duration-300 ease-out',
        isAdded
          ? 'cursor-default border-black/10 bg-black/5 opacity-70'
          : 'cursor-pointer border-black/10 hover:border-black/15 hover:bg-black/5'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
        {year !== 'N/A' && <p className="text-[11px] font-medium text-black/50">{year}</p>}
      </div>

      <motion.span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-[8px] border',
          isAdded
            ? 'border-info bg-info text-white'
            : 'border-black/10 text-black/50 group-hover:border-black/15 group-hover:text-black'
        )}
      >
        <Icon icon={isAdded ? 'material-symbols:check-rounded' : 'material-symbols:add-rounded'} size={16} />
      </motion.span>
    </motion.button>
  );
}
function DraftItemRow({ index, item, onRemove }) {
  const title = getItemDisplayTitle(item);
  const year = getItemYear(item);
  return (
    <motion.div
      {...getMovieRowAnimation(index)}
      layout
      className="group bg-primary flex items-center gap-3 rounded-[10px] border border-black/5 px-3 py-2 transition-all duration-300 ease-out hover:border-black/10"
    >
      <span className="w-5 text-center text-[11px] font-bold tracking-widest text-black/50">{index + 1}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{title}</p>
        {year !== 'N/A' && <p className="text-[11px] font-medium text-black/50">{year}</p>}
      </div>

      <MotionButton
        variant="destructive-icon"
        onClick={() => onRemove(item)}
        {...listButtonTap}
        className="size-7 shrink-0 rounded-[8px] opacity-0 transition-all duration-200 ease-in-out group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Remove ${title}`}
      >
        <Icon icon="material-symbols:close-rounded" size={16} />
      </MotionButton>
    </motion.div>
  );
}
