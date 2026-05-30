'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import AccountPagination from '@/features/account/components/pagination';
import AccountInlineSectionState from '@/features/account/components/section-state';
import { ProfileMediaActions } from '@/features/account/components/media-grid';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import { TMDB_IMG } from '@/core/constants';
import MediaCard from '@/ui/media/media-card';

const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';
const MAX_ROWS_PER_PAGE = 8;
const MOBILE_ITEMS_PER_PAGE = 3 * MAX_ROWS_PER_PAGE;
const DESKTOP_ITEMS_PER_PAGE = 6 * MAX_ROWS_PER_PAGE;

function useResponsivePageSize() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;
}

function getPosterUrl(item) {
  const preferredPoster = getPreferredMoviePosterSrc(item, 'w342');
  if (preferredPoster) {
    return preferredPoster;
  }

  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

export default function ListDetailMediaGrid({
  emptyMessage = 'No titles in this list yet.',
  isOwner = false,
  items = [],
  onRemoveItem = null,
  toolbar = null,
  userId = null,
}) {
  const itemsPerPage = useResponsivePageSize();
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = items.length ? Math.ceil(items.length / itemsPerPage) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * itemsPerPage;
  const visibleItems = useMemo(
    () => items.slice(pageStart, pageStart + itemsPerPage),
    [items, pageStart, itemsPerPage, posterPreferenceVersion]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {toolbar}
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {toolbar}

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {visibleItems.map((item, index) => {
          const mediaType = item?.entityType || item?.media_type;
          const mediaId = item?.entityId || item?.id;
          const title = item?.title || item?.name || 'Untitled';

          return (
            <motion.div
              key={`${item.mediaKey || `${mediaType}-${mediaId}`}-${pageStart + index}`}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.986 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
              transition={{
                delay: index < 6 ? index * 0.018 : 0,
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <MediaCard
                href={`/${mediaType}/${mediaId}`}
                className="w-full"
                imageSrc={getPosterUrl(item)}
                imageAlt={title}
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                topOverlay={
                  isOwner && typeof onRemoveItem === 'function' ? (
                    <ProfileMediaActions
                      media={item}
                      onRemoveItem={onRemoveItem}
                      removeLabel={`Remove ${title} from this list`}
                      userId={userId}
                    />
                  ) : null
                }
                tooltipText={title}
              />
            </motion.div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <AccountPagination
          className="w-full"
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : null}
    </div>
  );
}
