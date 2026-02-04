import type { INestApplication } from '@nestjs/common';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import morgan from 'morgan';

/**
 * Sets up:
 * - API prefix (+ excludes for "" and "health")
 * - morgan logger
 * - Validation pipe
 * - Global HttpExceptionFilter
 */
export function configureHttp(app: INestApplication, apiPrefix: string) {
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: '', method: RequestMethod.ALL },
      { path: 'health', method: RequestMethod.ALL },
    ],
  });

  app.use(morgan('dev'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
}
