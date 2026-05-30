'use client';

import { motion } from 'framer-motion';

import { NAV_CONTENT_TRANSITION } from '@/core/modules/nav/motion';

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
  onSearchTypeChange,
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
    searchType,
  } = useSearchActionController({
    loading: controlledLoading,
    onQueryChange,
    onSearchTypeChange,
    query: controlledQuery,
    searchType: controlledSearchType,
    variant,
  });

  return (
    <motion.div className="mt-2.5 w-full" layout="position" transition={NAV_CONTENT_TRANSITION}>
      <SearchActionControls
        loading={loading}
        query={query}
        searchType={searchType}
        showTabsWhenEmpty={isPageVariant}
        onClear={handleClear}
        onQueryChange={handleQueryChange}
        onSearchTypeChange={handleSearchTypeChange}
      />
      {!isPageVariant ? (
        <SearchActionResultsPreview
          imageErrors={imageErrors}
          query={query}
          results={results}
          onImageError={handleImageError}
          onSeeAllResults={handleSeeAllResults}
          onSelect={handleSelect}
        />
      ) : null}
    </motion.div>
  );
}
