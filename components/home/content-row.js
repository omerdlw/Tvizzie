'use client'

import { motion } from 'framer-motion'

import ContentCard from '@/components/home/content-card'
import Carousel from '@/components/shared/carousel'

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const SECTION_TRANSITION = { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }

export default function ContentRow({ title, items = [], mediaType }) {
  if (!items.length) return null

  const enrichedItems = mediaType
    ? items.map((item) => ({
      ...item,
      media_type: item.media_type || mediaType,
    }))
    : items

  return (
    <motion.div
      className="-m-1 flex flex-col gap-3"
      variants={FADE_UP}
      transition={SECTION_TRANSITION}
    >
      <h2 className="ml-1 text-xs font-semibold tracking-widest text-white/40 uppercase">
        {title}
      </h2>
      <Carousel gap="gap-3">
        {enrichedItems.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </Carousel>
    </motion.div>
  )
}
