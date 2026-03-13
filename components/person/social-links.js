'use client'

import Icon from '@/ui/icon'

const SOCIAL_LINKS = [
  {
    key: 'imdb_id',
    icon: 'cib:imdb',
    getUrl: (id) => `https://www.imdb.com/name/${id}`,
    label: 'IMDB',
  },
  {
    key: 'instagram_id',
    icon: 'mdi:instagram',
    getUrl: (id) => `https://instagram.com/${id}`,
    label: 'Instagram',
  },
  {
    key: 'twitter_id',
    icon: 'mdi:twitter',
    getUrl: (id) => `https://twitter.com/${id}`,
    label: 'Twitter',
  },
  {
    key: 'facebook_id',
    icon: 'mdi:facebook',
    getUrl: (id) => `https://facebook.com/${id}`,
    label: 'Facebook',
  },
  {
    key: 'tiktok_id',
    icon: 'ic:baseline-tiktok',
    getUrl: (id) => `https://tiktok.com/@${id}`,
    label: 'TikTok',
  },
  {
    key: 'youtube_id',
    icon: 'mdi:youtube',
    getUrl: (id) => `https://youtube.com/@${id}`,
    label: 'YouTube',
  },
  {
    key: 'wikidata_id',
    icon: 'simple-icons:wikidata',
    getUrl: (id) => `https://www.wikidata.org/wiki/${id}`,
    label: 'Wikidata',
  },
]

export default function SocialLinks({ externalIds }) {
  if (!externalIds) return null

  const availableLinks = SOCIAL_LINKS.filter(
    (link) => externalIds[link.key] && externalIds[link.key] !== ''
  )

  if (!availableLinks.length) return null

  return (
    <div className="flex items-center gap-3">
      {availableLinks.map((link) => (
        <a
          key={link.key}
          href={link.getUrl(externalIds[link.key])}
          target="_blank"
          rel="noopener noreferrer"
          title={link.label}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 opacity-60 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-[var(--motion-duration-normal)] hover:bg-white/10 hover:opacity-100 hover:ring-white/15"
        >
          <Icon icon={link.icon} size={20} className="text-white" />
        </a>
      ))}
    </div>
  )
}
