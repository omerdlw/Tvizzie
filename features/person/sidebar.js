'use client';

import { useMemo, useState } from 'react';

import Image from 'next/image';

import PersonBio from '@/features/person/bio';
import SocialLinks from '@/features/person/social-links';
import { TMDB_IMG } from '@/core/constants';
import { getImagePlaceholderDataUrl } from '@/core/utils';
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
    <div className="flex items-start gap-2 py-1.5 text-sm text-black">
      <Icon icon={icon} size={18} className="mt-0.5 shrink-0 text-black/70" />
      <div className="flex-1 leading-relaxed font-medium">
        {label}: <span className="text-black/70">{value}</span>
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
    <div className="flex flex-col gap-3">
      <div className="relative aspect-2/3 w-full max-w-none shrink-0 overflow-hidden rounded-[14px] lg:h-[600px] lg:w-[400px]">
        {hasImage ? (
          <Image
            src={imageSrc}
            alt={person?.name || 'Person portrait'}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 400px"
            quality={88}
            placeholder="blur"
            blurDataURL={getImagePlaceholderDataUrl(`${person?.id || person?.name}-${imageSrc}`)}
            onError={() => setHasImageError(true)}
            className="object-cover"
          />
        ) : (
          <div className="bg-primary center h-full w-full border border-black/5 text-black/60">
            <Icon icon="solar:user-bold" size={64} className="text-black/70" />
          </div>
        )}

        {person?.external_ids ? (
          <SocialLinks
            externalIds={person.external_ids}
            className="absolute inset-x-0 bottom-4 z-10 justify-center px-4"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {detailRows.map((row) => (
          <SidebarRow key={`${row.label}-${row.value}`} icon={row.icon} label={row.label} value={row.value} />
        ))}
      </div>

      {person?.biography ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Bio</h2>
          <PersonBio biography={person.biography} />
        </div>
      ) : null}
    </div>
  );
}
