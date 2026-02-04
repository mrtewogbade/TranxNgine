import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

/**
 * Redis Cache Module
 * Provides Redis caching for:
 * - Wallet balance caching
 * - Idempotency key lookups
 * - Rate limiting
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD', ''),
        ttl: configService.get('REDIS_TTL', 300), // 5 minutes default
        max: 100, // Maximum number of items in cache
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
