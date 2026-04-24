class SmartCache {
  constructor(ttl = 5 * 60 * 1000) {
    this.store = new Map();
    this.promises = new Map();
    this.subscribers = new Map();
    this.ttl = ttl;
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    const subscribers = this.subscribers.get(key);
    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);

      if (subscribers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  notify(key, data) {
    this.subscribers.get(key)?.forEach((callback) => {
      callback(data);
    });
  }

  set(key, data, ttl = this.ttl) {
    this.store.set(key, {
      data,
      expires: Date.now() + ttl,
    });

    this.notify(key, data);
  }

  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() <= entry.expires) {
      return entry.data;
    }

    this.store.delete(key);
    return null;
  }

  async fetchOrGet(key, fetcher, ttl) {
    const cached = this.get(key);

    if (cached !== null) {
      return cached;
    }

    if (this.promises.has(key)) {
      return this.promises.get(key);
    }

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.promises.delete(key);
      });

    this.promises.set(key, promise);

    return promise;
  }

  delete(key) {
    this.store.delete(key);
    this.notify(key, null);
  }

  clear() {
    const keys = [...this.store.keys()];

    this.store.clear();
    this.promises.clear();
    keys.forEach((key) => this.notify(key, null));
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count += 1;
      }
    }

    return count;
  }

  get size() {
    return this.store.size;
  }
}

export const apiCache = new SmartCache();
