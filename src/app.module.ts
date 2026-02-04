import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletModule } from './modules/wallet.module';
import { RedisCacheModule } from './modules/redis-cache.module';
import { LoggerModule } from './logger/logger.module';
import { Wallet } from './models/wallet.model';
import { Ledger } from './models/ledger.model';
import { TransactionLog } from './models/transaction-log.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    RedisCacheModule, // Redis cache module
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'wallet_system',
      models: [Wallet, Ledger, TransactionLog],
      autoLoadModels: true,
      synchronize: false, // Use migrations instead
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    }),
    WalletModule,
  ],
})
export class AppModule {}
