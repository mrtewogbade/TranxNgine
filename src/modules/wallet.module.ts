import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletController } from '../controllers/wallet.controller';
import { WalletService } from '../services/wallet.service';
import { RedisService } from '../services/redis.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { Wallet } from '../models/wallet.model';
import { Ledger } from '../models/ledger.model';
import { TransactionLog } from '../models/transaction-log.model';

@Module({
  imports: [SequelizeModule.forFeature([Wallet, Ledger, TransactionLog])],
  controllers: [WalletController],
  providers: [WalletService, RedisService, RateLimitGuard],
  exports: [WalletService, RedisService],
})
export class WalletModule {}
