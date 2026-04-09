'use client';

import { useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import Icon from '@/ui/icon';

const MAX_VISIBLE = 8;

function PersonCard({ person, priority = false, fetchPriority }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = person.profile_path && !imageError ? `${TMDB_IMG}/w185${person.profile_path}` : null;

  return (
    <Link
      href={`/person/${person.id}`}
      onDragStart={(event) => event.preventDefault()}
      className="group bg-primary/30 hover:bg-primary/60 flex items-center gap-2 rounded-[14px] border border-black/10 p-1 pr-4 backdrop-blur-sm transition-all duration-(--motion-duration-normal) hover:border-black/20"
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden">
        {imageSrc ? (
          <Image
            fill
            alt={person.name}
            src={imageSrc}
            sizes="64px"
            priority={priority}
            fetchPriority={fetchPriority}
            quality={72}
            draggable={false}
            className="rounded-[10px] object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="center h-full w-full">
            <Icon icon="solar:user-bold" size={20} className="text-[#475569]" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-black">{person.name}</span>
        <span className="truncate text-xs text-black/70">{person.character}</span>
      </div>
    </Link>
  );
}

export default function CastSection({ cast = [], headerAction = null }) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  if (!cast.length) {
    return null;
  }

  const hasOverflow = cast.length > MAX_VISIBLE;
  const visibleCast = expanded ? cast : cast.slice(0, MAX_VISIBLE);

  return (
    <motion.section layout className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Top billed cast</h2>

        {(headerAction || hasOverflow) && (
          <div className="flex items-center gap-3">
            {headerAction}

            {hasOverflow && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="text-[11px] font-semibold tracking-widest text-black/70 uppercase transition-colors hover:text-black"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      <motion.div
        layout
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        initial={false}
        animate={{
          transition: {
            staggerChildren: reduceMotion ? 0 : 0.04,
            delayChildren: reduceMotion ? 0 : 0.03,
          },
        }}
      >
        <AnimatePresence initial={false}>
          {visibleCast.map((person, index) => (
            <motion.div
              key={`${person.id || person.name || 'cast'}-${index}`}
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
              transition={{
                duration: reduceMotion ? 0.14 : 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <PersonCard person={person} priority={index < 4} fetchPriority={index < 4 ? 'high' : undefined} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  );
}
