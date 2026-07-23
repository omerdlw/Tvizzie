'use client';

import SearchResultItem from './item';

export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  results = [],
  onImageError,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  if (!hasQuery || results.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-1 overflow-hidden">
      {results.map((item) => (
        <div key={`${item.media_type}-${item.id}`}>
          <SearchResultItem
            item={item}
            imageErrors={imageErrors}
            onImageError={onImageError}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
