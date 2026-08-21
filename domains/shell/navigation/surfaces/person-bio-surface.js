'use client';

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

  return (
    <div className="max-h-[min(50dvh,24rem)] w-full overflow-y-auto bg-white/5 px-4 py-3">
      {normalizedBiography ? (
        <div className="py-1">
          <p className="text-left text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-line text-white/70">
            {normalizedBiography}
          </p>
        </div>
      ) : null}
    </div>
  );
}
