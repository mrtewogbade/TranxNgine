import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../services/redis.service';

/**
 * RateLimitGuard
 * Uses Redis to implement rate limiting
 *
 * Prevents API abuse by limiting requests per IP address
 * Default: 100 requests per minute
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip =
      (request.ip as string) ??
      ((request.connection as Record<string, unknown>)
        ?.remoteAddress as string) ??
      'unknown';

    // Rate limit: 100 requests per minute per IP
    const allowed = await this.redisService.checkRateLimit(
      `ip:${ip}`,
      100, // max requests
      60, // window in seconds
    );

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: 'Rate Limit Exceeded',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
