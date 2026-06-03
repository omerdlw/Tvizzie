'use client';

import { SEARCH_ACTION_VARIANTS } from './constants';
import SearchActionControls from './parts/controls';
import SearchActionResultsPreview from './parts/results-preview';
import { useSearchActionController } from './use-search-action-controller';
export default function SearchAction({
  loading: controlledLoading = false,
  query: controlledQuery,
  searchType: controlledSearchType,
  variant = SEARCH_ACTION_VARIANTS.DEFAULT,
  onQueryChange,
  onSearchTypeChange
}) {
  const {
    handleClear,
    handleImageError,
    handleQueryChange,
    handleSearchTypeChange,
    handleSeeAllResults,
    handleSelect,
    imageErrors,
    isPageVariant,
    loading,
    query,
    results,
    searchType
  } = useSearchActionController({
    loading: controlledLoading,
    onQueryChange,
    onSearchTypeChange,
    query: controlledQuery,
    searchType: controlledSearchType,
    variant
  });
  return <div className="mt-2.5 w-full">
      <SearchActionControls loading={loading} query={query} searchType={searchType} showTabsWhenEmpty={isPageVariant} onClear={handleClear} onQueryChange={handleQueryChange} onSearchTypeChange={handleSearchTypeChange} />
      {!isPageVariant ? <SearchActionResultsPreview imageErrors={imageErrors} query={query} results={results} onImageError={handleImageError} onSeeAllResults={handleSeeAllResults} onSelect={handleSelect} /> : null}
    </div>;
}
