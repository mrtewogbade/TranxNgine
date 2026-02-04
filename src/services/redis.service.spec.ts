import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          ttl: 300,
          max: 100,
        }),
      ],
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  beforeEach(async () => {
    // Clear cache before each test
    await service.reset();
  });

  describe('Wallet Balance Caching', () => {
    it('should cache and retrieve wallet balance', async () => {
      const walletId = 'test-wallet-1';
      const balance = '1000.00';

      await service.cacheWalletBalance(walletId, balance);
      const cached = await service.getCachedWalletBalance(walletId);

      expect(cached).toBe(balance);
    });

    it('should return null for non-existent wallet', async () => {
      const cached = await service.getCachedWalletBalance('non-existent');
      expect(cached).toBeNull();
    });

    it('should invalidate wallet balance', async () => {
      const walletId = 'test-wallet-2';
      const balance = '500.00';

      await service.cacheWalletBalance(walletId, balance);
      await service.invalidateWalletBalance(walletId);

      const cached = await service.getCachedWalletBalance(walletId);
      expect(cached).toBeNull();
    });
  });

  describe('Idempotency Caching', () => {
    it('should cache and retrieve idempotency result', async () => {
      const key = 'idempotency-key-1';
      const result = {
        transactionId: 'tx-123',
        amount: '100.00',
        status: 'COMPLETED',
      };

      await service.cacheIdempotencyResult(key, result);
      const cached = await service.getCachedIdempotencyResult(key);

      expect(cached).toEqual(result);
    });

    it('should return null for non-existent key', async () => {
      const cached = await service.getCachedIdempotencyResult('non-existent');
      expect(cached).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const identifier = 'user-1';
      const allowed = await service.checkRateLimit(identifier, 5, 60);
      expect(allowed).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      const identifier = 'user-2';

      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        const allowed = await service.checkRateLimit(identifier, 5, 60);
        expect(allowed).toBe(true);
      }

      // 6th request should be blocked
      const blocked = await service.checkRateLimit(identifier, 5, 60);
      expect(blocked).toBe(false);
    });

    it('should reset after window expires', async () => {
      const identifier = 'user-3';

      // Use up limit with 1 second window
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(identifier, 3, 1);
      }

      // Should be blocked immediately
      const blocked = await service.checkRateLimit(identifier, 3, 1);
      expect(blocked).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      const allowed = await service.checkRateLimit(identifier, 3, 1);
      expect(allowed).toBe(true);
    }, 10000); // Increase timeout for this test
  });

  describe('Generic Cache Operations', () => {
    it('should set and get values', async () => {
      await service.set('test-key', 'test-value');
      const value = await service.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should delete values', async () => {
      await service.set('test-key-2', 'value');
      await service.del('test-key-2');
      const value = await service.get('test-key-2');
      expect(value).toBeNull();
    });

    it('should handle complex objects', async () => {
      const obj = {
        name: 'Test',
        amount: 1000,
        items: ['a', 'b', 'c'],
      };

      await service.set('complex-obj', JSON.stringify(obj));
      const cached = await service.get<string>('complex-obj');
      expect(JSON.parse(cached)).toEqual(obj);
    });
  });

  describe('Transfer Result Caching', () => {
    it('should cache and retrieve transfer result', async () => {
      const transactionLogId = 'tx-log-123';
      const result = {
        debit: { id: 'debit-1', amount: '100.00' },
        credit: { id: 'credit-1', amount: '100.00' },
      };

      await service.cacheTransferResult(transactionLogId, result);
      const cached = await service.getCachedTransferResult(transactionLogId);

      expect(cached).toEqual(result);
    });
  });
});
