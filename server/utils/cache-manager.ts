/**
 * SameVibe Scalability Infrastructure — In-Memory Cache Manager
 *
 * Provides fast, type-safe TTL caching with tag-based invalidation
 * for read-heavy public endpoints (e.g. recommended communities, trending events).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags: string[];
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries = 500;

  /**
   * Get cached item if present and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with TTL (seconds) and optional invalidation tags
   */
  set<T>(key: string, data: T, ttlSeconds = 60, tags: string[] = []): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entries when limit reached
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  /**
   * Invalidate all cache entries matching a tag (e.g. 'communities', 'events')
   */
  invalidateTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
}

export const cacheManager = new CacheManager();
