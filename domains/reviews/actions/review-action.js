'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
  const currentLabel = isSubmitting ? loadingLabel || fallbackLoadingLabel : submitLabel || fallbackSubmitLabel;

  return (
    <div className={NAV_ACTION_STYLES.row}>
      <motion.button
        type="button"
        whileHover={isSubmitting || !canSubmit ? undefined : { scale: 1.012 }}
        whileTap={isSubmitting || !canSubmit ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
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
        <AnimatePresence mode="wait">
          <motion.span
            key={currentLabel}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
          >
            {currentLabel}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
