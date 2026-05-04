'use client';

import { useMemo, useState } from 'react';

import PersonBio from '@/features/person/bio';
import SocialLinks from '@/features/person/social-links';
import { TMDB_IMG } from '@/core/constants';
import { getImagePlaceholderDataUrl, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

function getProfileImage(path) {
  if (!path) {
    return null;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${TMDB_IMG}/h632${normalizedPath}`;
}

function getYear(value) {
  return typeof value === 'string' && value.length >= 4 ? value.slice(0, 4) : null;
}

function createSidebarRow({ icon, label, value }) {
  if (!value) {
    return null;
  }

  return {
    icon,
    label,
    value,
  };
}

function SidebarRow({ icon, label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 py-1.5 text-sm text-white">
      <Icon icon={icon} size={18} className="mt-0.5 shrink-0 text-white/70" />
      <div className="flex-1 leading-relaxed font-medium">
        {label}: <span className="text-white/70">{value}</span>
      </div>
    </div>
  );
}

export default function PersonSidebar({ person, age }) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageSrc = getProfileImage(person?.profile_path);
  const hasImage = Boolean(imageSrc) && !hasImageError;
  const birthYear = getYear(person?.birthday);
  const deathYear = getYear(person?.deathday);
  const ageLabel =
    age !== null && age !== undefined ? `${age}${person?.deathday ? ' years lived' : ' years old'}` : null;

  const detailRows = useMemo(
    () =>
      [
        createSidebarRow({
          icon: 'solar:case-round-bold',
          label: 'Type',
          value: person?.known_for_department || 'Person',
        }),
        createSidebarRow({
          icon: 'solar:calendar-bold',
          label: 'Born',
          value: birthYear,
        }),
        createSidebarRow({
          icon: 'solar:calendar-mark-bold',
          label: 'Died',
          value: deathYear,
        }),
        createSidebarRow({
          icon: 'solar:clock-circle-bold',
          label: 'Age',
          value: ageLabel,
        }),
        createSidebarRow({
          icon: 'solar:map-point-bold',
          label: 'Birthplace',
          value: person?.place_of_birth || null,
        }),
      ].filter(Boolean),
    [ageLabel, birthYear, deathYear, person?.known_for_department, person?.place_of_birth]
  );

  return (
    <div className="flex flex-col gap-0">
      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact grid-diamonds-bottom flex flex-col gap-3 border-b border-white/10 py-5 lg:py-7">
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded">
          {hasImage ? (
            <AdaptiveImage
              src={imageSrc}
              alt={person?.name || 'Person portrait'}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 400px"
              quality={resolveImageQuality('hero')}
              decoding="async"
              placeholder="blur"
              blurDataURL={getImagePlaceholderDataUrl(`${person?.id || person?.name}-${imageSrc}`)}
              onError={() => setHasImageError(true)}
              className="object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="bg-primary center h-full w-full border border-white/10 text-white/50">
              <Icon icon="solar:user-bold" size={64} className="text-white/70" />
            </div>
          )}

          {person?.external_ids ? (
            <SocialLinks
              externalIds={person.external_ids}
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
            />
          ) : null}
        </div>
      </div>

      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-5 py-6 lg:py-7">
        <div className="flex flex-col gap-1">
          {detailRows.map((row) => (
            <SidebarRow key={`${row.label}-${row.value}`} icon={row.icon} label={row.label} value={row.value} />
          ))}
        </div>

        {person?.biography ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase">Bio</h2>
            <PersonBio biography={person.biography} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
