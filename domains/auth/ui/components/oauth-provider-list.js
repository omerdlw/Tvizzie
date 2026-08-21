'use client';

import { OAUTH_PROVIDER_KEYS } from '@/modules/auth/provider-utils';
import OAuthProviderButton from './oauth-provider-button';

export function OAuthProviderList({ activeProvider = null, disabled = false, mode, onSelect }) {
  return (
    <div className="flex items-center gap-3">
      {OAUTH_PROVIDER_KEYS.map((provider, index) => (
        <div key={provider} className="flex-1">
          <OAuthProviderButton
            provider={provider}
            mode={mode}
            isBusy={activeProvider === provider}
            disabled={disabled || Boolean(activeProvider)}
            onClick={() => onSelect(provider)}
          />
        </div>
      ))}
    </div>
  );
}

export default OAuthProviderList;
