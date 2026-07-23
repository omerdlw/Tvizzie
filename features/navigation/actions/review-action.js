'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';

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

  return (
    <div className={NAV_ACTION_STYLES.row}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isSubmitting) submitReview?.(e);
        }}
        className={getNavActionClass({
          className: '',
        })}
        disabled={isSubmitting || !canSubmit}
        type="button"
      >
        {isSubmitting ? loadingLabel || fallbackLoadingLabel : submitLabel || fallbackSubmitLabel}
      </button>
    </div>
  );
}
