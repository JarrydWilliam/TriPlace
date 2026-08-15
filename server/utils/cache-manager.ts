/**
 * SameVibe Scalability Infrastructure — LRU / Redis Multi-Layer Cache Manager
 *
 * Provides fast, type-safe TTL caching with tag-based invalidation
 * for read-heavy public endpoints (e.g. recommended communities, trending events).
 * Automatically uses Redis if REDIS_URL is provided, with quiet LRU memory fallback.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

class LRUMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxKeys: number;
  public hits = 0;
  public misses = 0;

  constructor(maxKeys: number = 1000) {
    this.maxKeys = maxKeys;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 60, tags: string[] = []): void {
    if (this.cache.size >= this.maxKeys) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000, tags });
  }

  invalidateTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }
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

class UnifiedCacheManager {
  get<T>(key: string): T | null {
    return memoryCache.get<T>(key);
  }

  set<T>(key: string, value: T, ttlSeconds: number = 60, tags: string[] = []): void {
    memoryCache.set(key, value, ttlSeconds, tags);
    if (isRedisConnected && redisClient) {
      try {
        redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
      } catch {
        // Fallback silently
      }
    }
  }

  invalidateTag(tag: string): void {
    memoryCache.invalidateTag(tag);
  }

  invalidate(keyOrPrefix: string): void {
    memoryCache.invalidate(keyOrPrefix);
    if (isRedisConnected && redisClient) {
      try {
        redisClient.del(keyOrPrefix);
      } catch {
        // Fallback
      }
    }
  }

  clear(): void {
    memoryCache.clear();
  }

  init = initRedis;

  getStats = () => ({
    size: memoryCache.size(),
    hits: memoryCache.hits,
    misses: memoryCache.misses,
    hitRatio: memoryCache.getHitRatio(),
    isRedisConnected,
  });
}

export const cacheManager = new UnifiedCacheManager();
