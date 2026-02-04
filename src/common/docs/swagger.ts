import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ENVIRONMENTS } from '../constants/environments';
import { API_PREFIX } from '../constants/app.constants';

export function setupSwagger(app: INestApplication) {
  const isProduction: boolean =
    process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION;
  const baseUrl = process.env.BASE_URL || `/${API_PREFIX}`;
  const description = isProduction
    ? 'Production server'
    : 'Local development server';
  const config = new DocumentBuilder()
    .setTitle('Finnovate Africa API')
    .setDescription('API documentation for Finnovate Africa backend')
    .setVersion('1.0.0')
    .addServer(baseUrl, description)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
    deepScanRoutes: true,
  });

  SwaggerModule.setup('/api/docs', app, document, {
    customSiteTitle: 'Finnovate Africa – API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
