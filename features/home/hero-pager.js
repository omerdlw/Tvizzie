'use client';

import { motion } from 'framer-motion';
import { HOME_HERO_PAGER_TRANSITION } from '@/app/(home)/motion';

function getTitle(item) {
  return item?.title || item?.original_title || item?.name || item?.original_name || 'Untitled';
}

export function HeroPager({ items = [], activeId, onSelect }) {
  if (items.length <= 1) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/26 px-2.5 py-2 backdrop-blur-sm">
      {items.map((item) => {
        const isActive = item?.id === activeId;

        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-label={`Show ${getTitle(item)}`}
            aria-pressed={isActive}
            animate={{
              width: isActive ? 28 : 10,
              opacity: isActive ? 1 : 0.8,
              backgroundColor: isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.34)',
            }}
            transition={HOME_HERO_PAGER_TRANSITION}
            className="h-2.5 rounded-full"
          />
        );
      })}
    </div>
  );
}
