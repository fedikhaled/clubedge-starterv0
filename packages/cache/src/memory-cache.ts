/** A key-value cache with per-entry expiry. Adapters: in-memory here, Redis in @clubedge/cache-redis. */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  /** Stores JSON, for a whole number of seconds; both adapters read a value back the same way. */
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

/** The TTL and value every adapter must accept, as the JSON text Redis stores. */
export function validateCacheEntry(key: string, value: unknown, ttlSeconds: number): string {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new Error("Cache TTL must be a positive whole number of seconds.");
  }
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error(`Cache values must be JSON serializable: "${key}".`);
  return json;
}

/**
 * Cache held in process memory. Entries are per server instance and vanish on restart, so use
 * Redis when the app runs on several instances. The oldest entry is evicted past `maxKeys`.
 */
export function createMemoryCache({
  maxKeys = 10_000,
  now = Date.now,
}: { maxKeys?: number; now?: () => number } = {}): Cache {
  const entries = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    async get<T>(key: string) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set(key, value, ttlSeconds) {
      const json = validateCacheEntry(key, value, ttlSeconds);
      entries.delete(key);
      if (entries.size >= maxKeys) entries.delete(entries.keys().next().value!);
      // Through JSON, so a value cached here reads back exactly as it would from Redis.
      entries.set(key, { value: JSON.parse(json), expiresAt: now() + ttlSeconds * 1000 });
    },
  };
}
