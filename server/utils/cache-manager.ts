interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxKeys: number;
  public hits = 0;
  public misses = 0;

  constructor(maxKeys: number = 1000) {
    this.maxKeys = maxKeys;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    if (this.cache.size >= this.maxKeys) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(keyOrPrefix: string): void {
    for (const k of this.cache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        this.cache.delete(k);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getHitRatio(): string {
    const total = this.hits + this.misses;
    if (total === 0) return "0.00%";
    return `${((this.hits / total) * 100).toFixed(2)}%`;
  }
}

export const memoryCache = new LRUMemoryCache(1000);
let redisClient: any = null;
let isRedisConnected = false;

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[CacheManager] REDIS_URL not set — using fast LRU memory cache.");
    return;
  }

  try {
    const redisModule = await import("redis" as string);
    redisClient = redisModule.createClient({ url: redisUrl });
    redisClient.on("error", (err: any) => console.warn("[Redis] Warning:", err.message));
    await redisClient.connect();
    isRedisConnected = true;
    console.log("[CacheManager] Connected to Redis.");
  } catch (err: any) {
    console.warn("[CacheManager] Fallback to LRU memory cache:", err.message);
  }
}

export async function getFromCache<T = any>(key: string): Promise<T | null> {
  const localVal = memoryCache.get<T>(key);
  if (localVal !== undefined) {
    return localVal;
  }

  if (isRedisConnected && redisClient) {
    try {
      const redisVal = await redisClient.get(key);
      if (redisVal !== null) {
        const parsed = JSON.parse(redisVal) as T;
        memoryCache.set(key, parsed, 300000);
        return parsed;
      }
    } catch {
      // Fallback silently
    }
  }

  return null;
}

export async function setInCache<T = any>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  memoryCache.set(key, value, ttlSeconds * 1000);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch {
      // Fallback silently
    }
  }
}

export function invalidateCache(keyOrPrefix: string): void {
  memoryCache.invalidate(keyOrPrefix);
  if (isRedisConnected && redisClient) {
    try {
      redisClient.del(keyOrPrefix);
    } catch {
      // Fallback
    }
  }
}

export const cacheManager = {
  get: getFromCache,
  set: setInCache,
  invalidate: invalidateCache,
  init: initRedis,
  getStats: () => ({
    size: memoryCache.size(),
    hits: memoryCache.hits,
    misses: memoryCache.misses,
    hitRatio: memoryCache.getHitRatio(),
    isRedisConnected,
  }),
};
