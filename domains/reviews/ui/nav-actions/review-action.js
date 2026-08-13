'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/ui/primitives/navigation-action-styles';

export default function ReviewAction({ reviewState }) {
  const {
    canSubmit = true,
    isSubmitting,
    loadingLabel,
    ownReview,
    submitLabel,
    submitReview,
  } = reviewState || {};

  const fallbackSubmitLabel = ownReview ? 'Update Review' : 'Publish Review';
  const fallbackLoadingLabel = ownReview ? 'Updating' : 'Publishing';
  const currentLabel = isSubmitting
    ? loadingLabel || fallbackLoadingLabel
    : submitLabel || fallbackSubmitLabel;

  return (
    <div className={NAV_ACTION_STYLES.row}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isSubmitting) submitReview?.(e);
        }}
        className={getNavActionClass({
          className: '',
        })}
        disabled={isSubmitting || !canSubmit}
      >
        <span>{currentLabel}</span>
      </button>
    </div>
  );
}
