import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * RedisService
 *
 *
 * Use Cases:
 * 1. Wallet balance caching - Faster balance lookups
 * 2. Idempotency key caching - Quick duplicate detection
 * 3. Rate limiting - API request throttling
 */
@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Cache wallet balance
   * TTL: 60 seconds (balance changes frequently)
   */
  async cacheWalletBalance(walletId: string, balance: string): Promise<void> {
    const key = `wallet:balance:${walletId}`;
    await this.cacheManager.set(key, balance, 60);
  }

  /**
   * Get cached wallet balance
   */
  async getCachedWalletBalance(walletId: string): Promise<string | null> {
    const key = `wallet:balance:${walletId}`;
    return (await this.cacheManager.get<string>(key)) ?? null;
  }

  /**
   * Invalidate wallet balance cache
   * Called after balance changes (e.g., transfers) to ensure cache consistency
   */
  async invalidateWalletBalance(walletId: string): Promise<void> {
    const key = `wallet:balance:${walletId}`;
    await this.cacheManager.del(key);
  }

  /**
   * Cache idempotency key result
   * TTL: 24 hours (idempotency keys should persist)
   */
  async cacheIdempotencyResult(
    idempotencyKey: string,
    result: any,
  ): Promise<void> {
    const key = `idempotency:${idempotencyKey}`;
    await this.cacheManager.set(key, JSON.stringify(result), 86400); // 24 hours
  }

  /**
   * Get cached idempotency result
   */
  async getCachedIdempotencyResult(
    idempotencyKey: string,
  ): Promise<any | null> {
    const key = `idempotency:${idempotencyKey}`;
    const cached = await this.cacheManager.get<string>(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Check rate limit for an operation
   * Returns true if allowed, false if rate limit exceeded
   */
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    const current = await this.cacheManager.get<number>(key);

    if (!current) {
      await this.cacheManager.set(key, 1, windowSeconds);
      return true;
    }

    if (current >= maxRequests) {
      return false;
    }

    await this.cacheManager.set(key, current + 1, windowSeconds);
    return true;
  }

  /**
   * Cache transfer transaction result
   * TTL: 1 hour
   */
  async cacheTransferResult(
    transactionLogId: string,
    result: any,
  ): Promise<void> {
    const key = `transfer:${transactionLogId}`;
    await this.cacheManager.set(key, JSON.stringify(result), 3600); // 1 hour
  }

  /**
   * Get cached transfer result
   */
  async getCachedTransferResult(transactionLogId: string): Promise<any | null> {
    const key = `transfer:${transactionLogId}`;
    const cached = await this.cacheManager.get<string>(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Generic cache set
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Generic cache get
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.cacheManager.get<T>(key);
    return result ?? null;
  }

  /**
   * Generic cache delete
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    const cm: any = this.cacheManager;
    if (typeof cm.reset === 'function') {
      await cm.reset();
      return;
    }
    if (cm.store && typeof cm.store.reset === 'function') {
      await cm.store.reset();
      return;
    }

    if (
      cm.store &&
      cm.store.getClient &&
      typeof cm.store.getClient === 'function'
    ) {
      const client = cm.store.getClient();
      if (client && typeof client.flushdb === 'function') {
        await client.flushdb();
        return;
      }
      if (client && typeof client.flushAll === 'function') {
        await client.flushAll();
        return;
      }
    }

    return;
  }
}
