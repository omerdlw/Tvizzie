'use client';

import { motion } from 'motion/react';
import { Button } from '@/ui/primitives';
import { getNavActionClass, NAV_ACTION_STYLES } from './constants';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

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
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className={NAV_ACTION_STYLES.row}
    >
      <Button
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
      </Button>
    </motion.div>
  );
}
