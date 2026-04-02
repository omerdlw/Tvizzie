import HomeDiscover from '@/features/home/discover'
import HeroSpotlight from '@/features/home/hero-spotlight'
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop'
import Carousel from '@/features/shared/carousel'
import MediaPosterCard from '@/features/shared/media-poster-card'
import { HOME_PAGE_MAX_WIDTH_CLASS } from '@/lib/constants'

function getUniqueMediaItems(items = []) {
  const seen = new Set()
  const uniqueItems = []

  for (const item of items) {
    const mediaType = item?.media_type || 'movie'
    const scopedId = `${mediaType}:${item?.id}`

    if (!item?.id || seen.has(scopedId)) {
      continue
    }

    seen.add(scopedId)
    uniqueItems.push({
      ...item,
      media_type: mediaType,
    })
  }

  return uniqueItems
}

function HomeContentRow({ title, items = [] }) {
  const uniqueItems = getUniqueMediaItems(items)

  if (!uniqueItems.length) {
    return null
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-widest text-white uppercase">
          {title}
        </h2>
        <button className="text-xs font-medium text-white/60 hover:text-white transition-colors">
          View All
        </button>
      </div>
      <Carousel
        gap="gap-3"
        itemClassName="w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)] lg:w-[calc((100%-60px)/6)] xl:w-[calc((100%-84px)/8)]"
      >
        {uniqueItems.map((item, index) => (
          <MediaPosterCard
            key={
              item.id
                ? `${item.media_type || 'movie'}-${item.id}`
                : `${title}-${index}`
            }
            item={item}
            className="w-full"
            imagePriority={index < 4}
            imageFetchPriority={index < 4 ? 'high' : undefined}
          />
        ))}
      </Carousel>
    </section>
  )
}

export default function View({ homeData = {} }) {
  const discover = homeData.discover || {}
  const popularRows = Array.isArray(homeData.popularRows)
    ? homeData.popularRows
    : []
  const heroItems = homeData.heroItems || []

  return (
   <></>
  )
}
