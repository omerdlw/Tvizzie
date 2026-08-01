'use client';

import { motion } from 'framer-motion';

export function createPersonBioSurfaceEntry(data = {}, config = {}) {
  return {
    component: PersonBioSurface,
    props: {
      biography: data.biography || data.person?.biography || '',
      person: data.person || null,
      name: data.name || data.person?.name || 'Biography',
    },
    expandHorizontal: true,
    width: 640,
    ...config,
  };
}

export default function PersonBioSurface({
  biography = '',
  close = null,
  name = 'Biography',
  onClose = null,
  person = null,
}) {
  const normalizedBiography = String(biography || '').trim();




  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.24, 1] }}
      className="bg-primary max-h-[min(50dvh,24rem)] w-full overflow-y-auto rounded-2xl px-4 py-3"
    >
      {normalizedBiography ? (
        <div className="py-1">
          <p className="text-justify text-sm leading-relaxed wrap-break-word whitespace-pre-line text-black/75">
            {normalizedBiography}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
