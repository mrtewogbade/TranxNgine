import {
  Injectable,
  Inject,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-idempotency-key'] || req.body?.idempotencyKey;

    if (!key) {
      return next.handle(); // no key → no idempotency
    }

    const cacheKey = `idempotency:${req.method}:${req.path}:${key}`;

    const existing = await this.cacheManager.get<any>(cacheKey);
    if (existing) {
      if ((existing as any).status === 'completed')
        return of((existing as any).data);
      if ((existing as any).status === 'processing')
        throw new ConflictException('Request is being processed');
    }

    await this.cacheManager.set(cacheKey, { status: 'processing' }, 300);

    return next.handle().pipe(
      tap((data) => {
        this.cacheManager.set(cacheKey, { status: 'completed', data }, 86400);
      }),
      catchError(async (err) => {
        await this.cacheManager.set(
          cacheKey,
          { status: 'failed', error: err.message },
          300,
        );
        throw err;
      }),
    );
  }
}
