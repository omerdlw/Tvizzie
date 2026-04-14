'use client';

import { cn } from '@/core/utils';
import { Tooltip } from '@/ui/elements/index';
import Icon from '@/ui/icon';

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
];

export default function SocialLinks({ externalIds, className = '', linkClassName = '' }) {
  if (!externalIds) return null;

  const availableLinks = SOCIAL_LINKS.filter((link) => externalIds[link.key] && externalIds[link.key] !== '');

  if (!availableLinks.length) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {availableLinks.map((link) => (
        <Tooltip className="bg-white text-black" key={link.key} text={link.label}>
          <a
            key={link.key}
            href={link.getUrl(externalIds[link.key])}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className={cn(
              'center bg-primary/70 size-10 border border-black/10 text-black/70 backdrop-blur-md transition-all duration-[var(--motion-duration-normal)] hover:border-black/20 hover:bg-white hover:text-black',
              linkClassName
            )}
          >
            <Icon icon={link.icon} size={20} />
          </a>
        </Tooltip>
      ))}
    </div>
  );
}
