'use client';

import { cn } from '@/ui/class-names';
import { Tooltip } from '@/ui/primitives/tooltip';
import Icon from '@/ui/primitives/icon';

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
  const availableLinks = SOCIAL_LINKS.filter(
    (link) => externalIds[link.key] && externalIds[link.key] !== '',
  );
  if (!availableLinks.length) return null;
  return (
    <div
      className={cn(
        'inline-flex h-9 w-fit items-center gap-1 overflow-hidden rounded-full text-white/70 transition-colors',
        className,
      )}
    >
      {availableLinks.map((link) => (
        <div key={link.key} className="center h-full">
          <Tooltip text={link.label}>
            <a
              href={link.getUrl(externalIds[link.key])}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              aria-label={link.label}
              className={cn(
                'center size-8 rounded-full text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white',
                linkClassName,
              )}
            >
              <Icon icon={link.icon} size={18} />
            </a>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
