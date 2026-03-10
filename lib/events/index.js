class EventEmitter {
  constructor() {
    this.events = {}
    this.debugMode = false
  }

  setDebugMode(enabled) {
    this.debugMode = Boolean(enabled)
  }

  subscribe(event, callback) {
    if (typeof event !== 'string' || !event) {
      return () => {}
    }

    if (typeof callback !== 'function') {
      return () => {}
    }

    if (!this.events[event]) {
      this.events[event] = []
    }

    this.events[event].push(callback)

    if (this.debugMode) {
      console.debug(
        `[Events] Subscribed to ${event}, total: ${this.events[event].length}`
      )
    }

    const unsubscribe = () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback)

      if (this.debugMode) {
        console.debug(`[Events] Unsubscribed from ${event}`)
      }
    }

    return unsubscribe
  }

  emit(event, data) {
    if (typeof event !== 'string' || !event) return

    if (this.debugMode) {
      console.debug(`[Events] Emitting ${event}`, data)
    }

    if (this.events[event]) {
      this.events[event].forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[Events] Error in listener for ${event}:`, error)
        }
      })
    }
  }

  unsubscribeAll(event) {
    if (event) {
      delete this.events[event]
    } else {
      this.events = {}
    }
  }

  hasListeners(event) {
    return Boolean(this.events[event]?.length)
  }

  getListenerCount(event) {
    return this.events[event]?.length || 0
  }

  getAllEvents() {
    return Object.keys(this.events)
  }
}

export const globalEvents = new EventEmitter()

export const EVENT_TYPES = {
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_FORBIDDEN: 'API_FORBIDDEN',
  API_ERROR: 'API_ERROR',
  API_RETRY: 'API_RETRY',
  APP_ERROR: 'APP_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  AUTH_READY: 'AUTH_READY',
  AUTH_REFRESH: 'AUTH_REFRESH',
  AUTH_SIGN_IN: 'AUTH_SIGN_IN',
  AUTH_SIGN_OUT: 'AUTH_SIGN_OUT',
  AUTH_SIGN_UP: 'AUTH_SIGN_UP',
  AUTH_UPDATE: 'AUTH_UPDATE',

  MODULE_INIT: 'MODULE_INIT',
  MODULE_READY: 'MODULE_READY',
  MODULE_ERROR: 'MODULE_ERROR',
  MODULE_CLEANUP: 'MODULE_CLEANUP',

  STATE_CHANGE: 'STATE_CHANGE',
  REGISTRY_UPDATE: 'REGISTRY_UPDATE',

  NAV_EXPAND: 'NAV_EXPAND',
  NAV_COLLAPSE: 'NAV_COLLAPSE',
  NAV_NAVIGATE: 'NAV_NAVIGATE',

  MODAL_OPEN: 'MODAL_OPEN',
  MODAL_CLOSE: 'MODAL_CLOSE',

  LOADING_START: 'LOADING_START',
  LOADING_END: 'LOADING_END',

  TRANSITION_START: 'TRANSITION_START',
  TRANSITION_END: 'TRANSITION_END',
}
