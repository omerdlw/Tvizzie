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
    <div
      className={cn(
        'inline-flex h-10 w-fit items-center overflow-hidden rounded border border-white/10 bg-black/60 text-white/70 backdrop-blur-md',
        className
      )}
    >
      {availableLinks.map((link, index) => {
        const isLast = index === availableLinks.length - 1;

        return (
          <div
            key={link.key}
            className={cn('flex h-10 items-center p-0.5', !isLast && 'border-r-[0.5px] border-white/10')}
          >
            <Tooltip className="bg-black text-white" text={link.label}>
              <a
                href={link.getUrl(externalIds[link.key])}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                className={cn(
                  'center hover:text-info hover:bg-info/20 h-full shrink-0 rounded-xs p-1 px-2 transition-all duration-[300ms]',
                  linkClassName
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
