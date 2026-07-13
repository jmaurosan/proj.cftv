interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export function createTimedCache<T>(ttlMs: number, now: () => number = Date.now) {
  const entries = new Map<string, CacheEntry<T>>()

  return {
    get(key: string) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt < now()) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key: string, value: T) {
      entries.set(key, { value, expiresAt: now() + ttlMs })
    },
    delete(key: string) {
      entries.delete(key)
    },
    clear() {
      entries.clear()
    },
  }
}
