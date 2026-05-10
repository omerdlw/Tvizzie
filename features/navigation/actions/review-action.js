import { motion } from 'framer-motion';

import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import {
  FEATURE_NAV_ACTION_BUTTON_MOTION,
  FEATURE_NAV_ACTION_ROW_MOTION,
  getFeatureNavSubmittingMotion,
} from '@/features/motion';

export default function ReviewAction({ reviewState }) {
  const { canSubmit = true, isSubmitting, loadingLabel, ownReview, submitLabel, submitReview } = reviewState || {};

  const fallbackSubmitLabel = ownReview ? 'Update Review' : 'Publish Review';
  const fallbackLoadingLabel = ownReview ? 'Updating' : 'Publishing';

  return (
    <motion.div className={NAV_ACTION_STYLES.row} {...FEATURE_NAV_ACTION_ROW_MOTION}>
      <motion.button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isSubmitting) submitReview?.(e);
        }}
        className={getNavActionClass()}
        disabled={isSubmitting || !canSubmit}
        type="button"
        animate={getFeatureNavSubmittingMotion(isSubmitting)}
        {...FEATURE_NAV_ACTION_BUTTON_MOTION}
      >
        {isSubmitting ? loadingLabel || fallbackLoadingLabel : submitLabel || fallbackSubmitLabel}
      </motion.button>
    </motion.div>
  );
}
