'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { NavSurfaceHeaderButton, useSurfaceHeader } from '@/modules/nav';
import {
  NAV_FADE_TRANSITION,
  NAV_MICRO_TRANSITION,
  navListItemVariants,
  textCrossfadeVariants,
} from '@/modules/nav';
import { useToast } from '@/modules/notification';
import { Button, Checkbox, Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { logWatchDiaryEntry, subscribeToWatchDiary } from '@/domains/media/client/watch-tracking';

function toLocalDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDiaryDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function getLatestDiaryDate(entries) {
  return (Array.isArray(entries) ? entries : []).reduce((latest, entry) => {
    const watchedOn = String(entry?.watchedOn || '').slice(0, 10);
    return watchedOn && (!latest || watchedOn > latest) ? watchedOn : latest;
  }, null);
}

function getEpisodeLabel(episode, seasonNumber) {
  const resolvedSeasonNumber = Number(
    seasonNumber ?? episode?.seasonNumber ?? episode?.season_number,
  );
  const episodeNumber = Number(episode?.episodeNumber ?? episode?.episode_number);
  if (!Number.isInteger(resolvedSeasonNumber) || !Number.isInteger(episodeNumber)) return null;
  const code = `S${String(resolvedSeasonNumber).padStart(2, '0')} · E${String(episodeNumber).padStart(2, '0')}`;
  const episodeTitle = episode?.episodeTitle || episode?.title || episode?.name;
  return episodeTitle ? `${code} · ${episodeTitle}` : code;
}

export function createWatchDiarySurfaceEntry(data = {}, config = {}) {
  return {
    component: WatchDiarySurface,
    description: 'A dated record of what you watched',
    icon: 'solar:calendar-add-bold',
    props: { data },
    title: 'Watch Diary',
    ...config,
  };
}

export default function WatchDiarySurface({ close, data }) {
  const media = data?.media || null;
  const episode = data?.episode || null;
  const seasonNumber =
    data?.seasonNumber ?? episode?.seasonNumber ?? episode?.season_number ?? null;
  const userId = data?.userId || null;
  const setHeader = useSurfaceHeader();
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasWatchedBefore, setHasWatchedBefore] = useState(false);
  const [watchedOn, setWatchedOn] = useState(() => toLocalDateValue());
  const title = media?.title || media?.name || 'this title';
  const episodeLabel = useMemo(
    () => getEpisodeLabel(episode, seasonNumber),
    [episode, seasonNumber],
  );
  const subtitle = useMemo(
    () => `Record ${episodeLabel ? `${title} · ${episodeLabel}` : title} in your diary`,
    [episodeLabel, title],
  );
  const latestWatchedOn = useMemo(() => getLatestDiaryDate(entries), [entries]);
  const today = toLocalDateValue();

  useEffect(() => {
    setHeader?.({
      description: subtitle,
      icon: 'solar:calendar-add-bold',
      title: 'Log to diary',
      trailing: null,
    });
  }, [close, entries, isSaving, setHeader, subtitle]);

  useEffect(() => {
    if (!userId || !media) {
      setEntries([]);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    return subscribeToWatchDiary(
      {
        episodeNumber: episode?.episodeNumber ?? episode?.episode_number ?? null,
        limitCount: 50,
        media,
        seasonNumber,
        userId,
      },
      (nextEntries) => {
        setEntries(Array.isArray(nextEntries) ? nextEntries : []);
        setIsLoading(false);
      },
      {
        onError: (error) => {
          setEntries([]);
          setIsLoading(false);
          toast.error(error?.message || 'Watch diary is temporarily unavailable');
        },
      },
    );
  }, [episode, media, seasonNumber, toast, userId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving || !media || !userId) return;
    setIsSaving(true);
    try {
      await logWatchDiaryEntry({
        episode,
        hasWatchedBefore,
        media,
        seasonNumber,
        userId,
        watchedOn,
      });
      setHasWatchedBefore(false);
      setWatchedOn(toLocalDateValue());
      toast.success('Added to your watch diary');
    } catch (error) {
      toast.error(error?.message || 'Watch diary entry could not be saved');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex w-full flex-col gap-2.5"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 border-b border-white/10 pb-4">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-white/70 uppercase">
          <Input
            type="date"
            value={watchedOn}
            min={latestWatchedOn || undefined}
            max={today}
            onChange={(event) => setWatchedOn(event.target.value)}
            classNames={{
              input:
                'h-11 w-full rounded-[20px] ring-1 ring-inset ring-white/10 bg-white/5 px-3 text-sm font-medium text-white transition-colors outline-none focus:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/40',
            }}
          />
        </label>
        <Checkbox
          checked={hasWatchedBefore}
          onCheckedChange={(checked) => setHasWatchedBefore(Boolean(checked))}
          classNames={{
            wrapper:
              'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[20px] ring-1 ring-inset ring-white/10 bg-white/5 px-3 transition-colors hover:ring-white/15',
            box: 'size-4 shrink-0 rounded-full ring-1 ring-inset ring-white/15 bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black',
            indicator: 'size-full text-black',
            label: 'text-sm font-medium text-white',
          }}
        >
          I have watched this before
        </Checkbox>
        <Button
          type="submit"
          disabled={isSaving}
          className="center h-11 w-full rounded-[20px] bg-white px-4 text-xs font-bold text-black uppercase transition-transform hover:bg-white/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving' : 'Log to diary'}
        </Button>
      </form>

      <div className="flex min-h-0 flex-col gap-2.5" aria-busy={isLoading} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="watch-diary-loading"
            variants={textCrossfadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_FADE_TRANSITION}
            className="flex flex-col divide-y divide-white/10 rounded-[20px] ring-1 ring-inset ring-white/5"
          >
            {Array.from({ length: 2 }).map((_, index) => (
              <motion.div
                key={index}
                  variants={navListItemVariants}
                initial="hidden"
                animate="visible"
                custom={index}
                transition={NAV_MICRO_TRANSITION}
                className="flex animate-pulse flex-col gap-2.5 px-3 py-3"
              >
                <div className="skeleton-block h-3 w-24 rounded-full" />
                <div className="skeleton-block-soft h-2.5 w-16 rounded-full" />
              </motion.div>
            ))}
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div
            key="watch-diary-empty"
            variants={textCrossfadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_FADE_TRANSITION}
            className="flex min-h-24 flex-col items-center justify-center gap-2.5 rounded-[20px] ring-1 ring-inset  ring-white/10 px-4 text-center"
          >
            <Icon icon="solar:calendar-minimalistic-bold" size={20} className="text-white/40" />
            <p className="text-sm text-white/40">
              Your first entry for {episodeLabel ? `${title} · ${episodeLabel}` : title} starts
              here.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="watch-diary-entries"
            variants={textCrossfadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_FADE_TRANSITION}
            className="max-h-[min(38dvh,22rem)] divide-y divide-white/10 overflow-y-auto rounded-[20px] ring-1 ring-inset ring-white/5"
          >
            {entries.map((entry, index) => (
              <motion.article
                key={entry.id}
                variants={navListItemVariants}
                initial="hidden"
                animate="visible"
                custom={index}
                transition={NAV_MICRO_TRANSITION}
                className="flex flex-col gap-1.5 px-3 py-3"
              >
                <time className="text-xs font-bold text-white/40 uppercase">
                  {formatDiaryDate(entry.watchedOn || entry.watchedAt)}
                </time>
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-white/40 uppercase">
                  {entry.isRewatch ? <span>Rewatch</span> : null}
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
