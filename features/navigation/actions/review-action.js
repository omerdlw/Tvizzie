'use client';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';
import { motion } from 'framer-motion';
import { NAV_ACTION_SPRING } from '@/core/modules/motion';

export default function ReviewAction({ reviewState }) {
  const { canSubmit = true, isSubmitting, loadingLabel, ownReview, submitLabel, submitReview } = reviewState || {};

  const fallbackSubmitLabel = ownReview ? 'Update Review' : 'Publish Review';
  const fallbackLoadingLabel = ownReview ? 'Updating' : 'Publishing';

  return (
    <div className={NAV_ACTION_STYLES.row}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        transition={NAV_ACTION_SPRING}
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
      </motion.button>
    </div>
  );
}
