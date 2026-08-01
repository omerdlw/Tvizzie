'use client';

import SearchActionControls from './components/controls';
import SearchActionResultsPreview from './components/results-preview';
import { useSearchActionController } from './use-search-action-controller';
export default function SearchAction({
  loading: controlledLoading = false,
  query: controlledQuery,
  searchType: controlledSearchType,
  onQueryChange,
  onSearchTypeChange,
}) {
  const {
    currentPage,
    debouncedQuery,
    handleClear,
    handleImageError,
    handleNextPage,
    handlePrevPage,
    handleQueryChange,
    handleSearchTypeChange,
    handleSelect,
    hasNextPage,
    hasPrevPage,
    imageErrors,
    loading,
    pageResults,
    query,
    results,
    searchType,
    totalPages,
  } = useSearchActionController({
    loading: controlledLoading,
    onQueryChange,
    onSearchTypeChange,
    query: controlledQuery,
    searchType: controlledSearchType,
  });
  return (
    <div className="mt-2.5 w-full">
      <SearchActionControls
        loading={loading}
        query={query}
        searchType={searchType}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onClear={handleClear}
        onQueryChange={handleQueryChange}
        onSearchTypeChange={handleSearchTypeChange}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
      />
      <SearchActionResultsPreview
        imageErrors={imageErrors}
        query={debouncedQuery}
        searchType={searchType}
        results={pageResults}
        currentPage={currentPage}
        totalPages={totalPages}
        onImageError={handleImageError}
        onSelect={handleSelect}
      />
    </div>
  );
}
