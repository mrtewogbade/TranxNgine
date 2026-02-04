import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  getLivenessInfo() {
    return {
      status: 'ok',
      env:
        this.config.get<string>('NODE_ENV') ??
        process.env.NODE_ENV ??
        'development',
      live: this.config.get<string>('IS_APP_LIVE') === 'true',
      uptime: `${Math.round(process.uptime())}s`,
      timestamp: new Date().toISOString(),
    };
  }
}
