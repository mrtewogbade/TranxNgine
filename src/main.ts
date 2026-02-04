import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { API_PREFIX } from './common/constants/app.constants';
import { setupSwagger } from './common/docs/swagger';
import { configureSecurity } from './bootstrap/security';
import { configureHttp } from './bootstrap/http';
import { installGracefulShutdown } from './bootstrap/shutdown';
import { isLiveEnv } from './bootstrap/is_live';
import helmet from 'helmet';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  app.use(helmet());
  app.enableCors();

  configureSecurity(app, isLiveEnv());
  configureHttp(app, API_PREFIX);
  setupSwagger(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`----- Server is running on port ${port} -----`);
  installGracefulShutdown(app);
}

void bootstrap();
