'use client';

import { useEffect } from 'react';
import { TMDB_IMG } from '@/core/constants';
import { useSurfaceHeader } from '@/core/modules/nav';
import { getPersonLifeRange } from '@/features/person/utils';

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
  const avatarUrl = person?.profile_path ? `${TMDB_IMG}/w185${person.profile_path}` : null;
  const personTitle = person?.name || name || 'Biography';
  const personSub =
    getPersonLifeRange(person) || person?.known_for_department || 'Biography';

  const setHeader = useSurfaceHeader();

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: avatarUrl || 'solar:user-bold',
        title: personTitle,
        description: personSub,
        trailing: null,
      });
    }
  }, [setHeader, avatarUrl, personTitle, personSub]);

  return (
    <div className="bg-primary max-h-[min(50dvh,24rem)] w-full overflow-y-auto rounded-[16px] px-4 py-3">
      {normalizedBiography ? (
        <div className="py-1">
          <p className="text-justify text-sm leading-relaxed wrap-break-word whitespace-pre-line text-black/75">
            {normalizedBiography}
          </p>
        </div>
      ) : null}
    </div>
  );
}
