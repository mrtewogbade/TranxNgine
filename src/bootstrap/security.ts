import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';

/**
 * Sets up security-related middlewares:
 * - Enables trust proxy (for correct client IPs behind proxies)
 * - Applies Helmet with:
 *    - Content Security Policy disabled
 *    - Conditional Cross-Origin headers based on environment
 *    - HSTS enabled in live mode
 * - Enables CORS globally
 */
export function configureSecurity(app: INestApplication, isLive: boolean) {
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', true);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: isLive,
      crossOriginOpenerPolicy: isLive ? { policy: 'same-origin' } : false,
      crossOriginResourcePolicy: isLive ? { policy: 'same-origin' } : false,
      hsts: isLive,
    }),
  );

  app.enableCors();
}
