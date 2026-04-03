import { registerGuard } from '@/core/modules/nav/guards'

import { createPlugin } from './create-plugin'

export const guardPlugin = createPlugin({
  name: 'guard',
  apply: (config) => {
    const guard = config?.guard
    if (!guard) return

    const guardWhen =
      typeof guard.when === 'function' ? guard.when : () => guard.when

    const unregisterGuard = registerGuard({
      message:
        guard.message ||
        'You have unsaved changes Are you sure you want to leave',
      onBlock: guard.onBlock,
      when: guardWhen,
    })

    const handleBeforeUnload = (e) => {
      const shouldBlock =
        typeof guard.when === 'function' ? guard.when() : guard.when
      if (shouldBlock) {
        e.preventDefault()
        e.returnValue = guard.message || ''
        return guard.message
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      unregisterGuard()
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  },
})
