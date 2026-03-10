class SmartCache {
  constructor(ttl = 5 * 60 * 1000) {
    this.subscribers = new Map()
    this.promises = new Map()
    this.store = new Map()
    this.ttl = ttl
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key).add(callback)

    return () => {
      const subs = this.subscribers.get(key)
      if (subs) {
        subs.delete(callback)
        if (subs.size === 0) this.subscribers.delete(key)
      }
    }
  }

  notify(key, data) {
    const subs = this.subscribers.get(key)
    if (subs) {
      subs.forEach((cb) => cb(data))
    }
  }

  set(key, data, ttl = this.ttl) {
    this.store.set(key, {
      expiresAt: Date.now() + ttl,
      timestamp: Date.now(),
      data,
    })
    this.notify(key, data)
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  fetchOrGet(key, fetchFn, ttl) {
    const cached = this.get(key)
    if (cached) return Promise.resolve(cached)

    if (this.promises.has(key)) {
      return this.promises.get(key)
    }

    const promise = fetchFn()
      .then((data) => {
        this.set(key, data, ttl)
        return data
      })
      .catch((err) => {
        throw err
      })
      .finally(() => {
        this.promises.delete(key)
      })

    this.promises.set(key, promise)
    return promise
  }

  delete(key) {
    this.store.delete(key)
    this.notify(key, null)
  }

  clear() {
    const keys = [...this.store.keys()]
    this.store.clear()
    this.promises.clear()
    keys.forEach((key) => this.notify(key, null))
  }

  has(key) {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }
    return true
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern)
    const keysToDelete = []
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => this.delete(key))
    return keysToDelete.length
  }

  get size() {
    return this.store.size
  }
}

export const apiCache = new SmartCache()
