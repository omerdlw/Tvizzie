'use client';

import { cn } from '@/core/utils';
import SearchResultItem from './item';
import { navActionClass } from '../utils';
export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  results = [],
  onImageError,
  onSeeAllResults,
  onSelect
}) {
  const hasQuery = Boolean(query.trim());
  return <>
      <>
        {results.length > 0 && hasQuery ? <div className="mt-2 flex flex-col gap-1 overflow-hidden">
            {results.map((item, index) => <div key={`${item.media_type}-${item.id}`}>
                <SearchResultItem item={item} imageErrors={imageErrors} onImageError={onImageError} onSelect={onSelect} />
              </div>)}
          </div> : null}
      </>

      <>
        {hasQuery ? <div className="mt-2 overflow-hidden">
            <button type="button" className={navActionClass({
          button: "relative w-full shrink-0 px-3 py-1.5 text-left text-xs whitespace-nowrap",
          cn
        })} onClick={onSeeAllResults}>
              See all results
            </button>
          </div> : null}
      </>
    </>;
}
