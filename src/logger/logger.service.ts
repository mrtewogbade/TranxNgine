import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request } from 'express';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const logsDir = this.configService.get<string>('LOGS_DIR', 'logs');

    const customFormat = winston.format.printf(
      ({ level, message, timestamp, context, trace, ...metadata }) => {
        const contextStr =
          context && typeof context === 'string'
            ? `[${context}] `
            : context
              ? `[${JSON.stringify(context)}] `
              : '';
        const levelStr = String(level).toUpperCase();
        let log = `${String(timestamp)} [${levelStr}] ${contextStr}${String(message)}`;

        if (Object.keys(metadata).length > 0) {
          log += ` ${JSON.stringify(metadata)}`;
        }

        if (trace) {
          const traceStr =
            typeof trace === 'string' ? trace : JSON.stringify(trace);
          log += `\n${traceStr}`;
        }

        return log;
      },
    );

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        customFormat,
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            customFormat,
          ),
        }),

        new DailyRotateFile({
          dirname: logsDir,
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),

        new DailyRotateFile({
          dirname: logsDir,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new DailyRotateFile({
          dirname: `${logsDir}/auth`,
          filename: 'auth-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
  logAuthAttempt(email: string, success: boolean, ip: string, metadata?: any) {
    this.logger.info('Auth attempt', {
      context: 'Auth',
      email,
      success,
      ip,
      ...metadata,
    });
  }

  logRegistration(email: string, ip: string) {
    this.logger.info('New user registration', {
      context: 'Auth',
      email,
      ip,
    });
  }

  logSuspiciousActivity(message: string, metadata: any) {
    this.logger.warn('Suspicious activity detected', {
      context: 'Security',
      message,
      ...metadata,
    });
  }
  logRequest(req: Request, responseTime?: number) {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      responseTime: responseTime ? `${responseTime}ms` : undefined,
    });
  }
}
