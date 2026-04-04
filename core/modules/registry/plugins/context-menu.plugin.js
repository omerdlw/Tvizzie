import { REGISTRY_TYPES } from '../context';
import { createPlugin } from './create-plugin';
import { splitRegistryConfig } from './registry-meta';

export const contextMenuPlugin = createPlugin({
  name: 'contextMenu',
  apply: (config, { register, unregister, pathname }) => {
    const contextMenu = config?.contextMenu;
    if (!contextMenu) return;

    const { payload, registerOptions, source } = splitRegistryConfig(contextMenu);

    const key = pathname || 'current-page';

    register(REGISTRY_TYPES.CONTEXT_MENU, key, payload, source, registerOptions);

    return () => {
      unregister(REGISTRY_TYPES.CONTEXT_MENU, key, source);
    };
  },
});
