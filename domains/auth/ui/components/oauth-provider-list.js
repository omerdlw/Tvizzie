'use client';

import { motion } from 'framer-motion';
import { OAUTH_PROVIDER_KEYS } from '@/core/modules/auth/provider-utils';
import OAuthProviderButton from './oauth-provider-button';

export default function OAuthProviderList({
  activeProvider = null,
  containerVariants,
  disabled = false,
  itemDelay = 0,
  itemVariants,
  mode,
  onSelect,
}) {
  return (
    <motion.div variants={containerVariants} className="flex items-center gap-3">
      {OAUTH_PROVIDER_KEYS.map((provider, index) => (
        <motion.div
          key={provider}
          custom={itemDelay + index * 0.08}
          variants={itemVariants}
          initial={false}
          animate="visible"
          whileHover="hover"
          whileTap="tap"
          className="flex-1"
        >
          <OAuthProviderButton
            provider={provider}
            mode={mode}
            isBusy={activeProvider === provider}
            disabled={disabled || Boolean(activeProvider)}
            onClick={() => onSelect(provider)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
