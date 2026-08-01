'use client';

import { cn } from '@/shared/lib';
import { Tooltip } from '@/ui/primitives/index';
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
        'inline-flex h-10 w-fit items-center overflow-hidden rounded-2xl border border-black/5 bg-black/5 text-black/70',
        className,
      )}
    >
      {availableLinks.map((link, index) => {
        const isFirst = index === 0;
        const isLast = index === availableLinks.length - 1;

        return (
          <div
            key={link.key}
            className={cn('center h-10 flex-auto p-1', !isLast && 'border-r border-black/5')}
          >
            <Tooltip text={link.label}>
              <a
                href={link.getUrl(externalIds[link.key])}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                className={cn(
                  'center hover:text-info hover:bg-primary transition-colors duration-150 ease-linear h-full w-full',
                  isFirst && 'rounded-l-[12px]',
                  isLast && 'rounded-r-[12px]',
                  linkClassName,
                )}
              >
                <Icon icon={link.icon} size={20} />
              </a>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
