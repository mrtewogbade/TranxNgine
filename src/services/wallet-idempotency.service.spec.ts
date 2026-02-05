import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletService, TransferResponse } from './wallet.service';
import { Wallet } from '../models/wallet.model';
import {
  Ledger,
  TransactionType,
  TransactionStatus,
} from '../models/ledger.model';
import { TransactionLog } from '../models/transaction-log.model';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

describe('WalletService - Idempotency Tests (Part A)', () => {
  let service: WalletService;
  let sequelize: Sequelize;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE_TEST || 'wallet_system_test',
          models: [Wallet, Ledger, TransactionLog],
          logging: false,
          sync: { force: true },
        }),
        SequelizeModule.forFeature([Wallet, Ledger, TransactionLog]),
      ],
      providers: [
        WalletService,
        {
          provide: require('../services/redis.service').RedisService,
          useValue: new (class {
            private store = new Map<string, string>();
            async cacheWalletBalance(k: string, v: string) {
              this.store.set(k, v);
            }
            async getCachedWalletBalance(k: string) {
              return this.store.get(k) ?? null;
            }
            async invalidateWalletBalance(k: string) {
              this.store.delete(`wallet:balance:${k}`);
            }
            async cacheIdempotencyResult(k: string, v: any) {
              this.store.set(`idempotency:${k}`, JSON.stringify(v));
            }
            async getCachedIdempotencyResult(k: string) {
              const v = this.store.get(`idempotency:${k}`);
              return v ? JSON.parse(v) : null;
            }
            async cacheTransferResult(k: string, v: any) {
              this.store.set(`transfer:${k}`, JSON.stringify(v));
            }
            async getCachedTransferResult(k: string) {
              const v = this.store.get(`transfer:${k}`);
              return v ? JSON.parse(v) : null;
            }
            async checkRateLimit() {
              return true;
            }
            async set() {}
            async get() {
              return null;
            }
            async del() {}
            async reset() {
              this.store.clear();
            }
          })(),
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    sequelize = module.get<Sequelize>(Sequelize);

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await TransactionLog.destroy({ where: {}, truncate: true, cascade: true });
    await Ledger.destroy({ where: {}, truncate: true, cascade: true });
    await Wallet.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Transfer with Idempotency Key', () => {
    it('should successfully transfer money', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      const result = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      expect(result.idempotencyKey).toBe(idempotencyKey);
      expect(result.debit.amount).toBe('100.00');
      expect(result.debit.balanceAfter).toBe('900.00');
      expect(result.credit.amount).toBe('100.00');
      expect(result.credit.balanceAfter).toBe('600.00');

      const updatedWallet1 = await service.getWalletById(wallet1.id);
      const updatedWallet2 = await service.getWalletById(wallet2.id);
      expect(updatedWallet1.balance).toBe('900.00');
      expect(updatedWallet2.balance).toBe('600.00');
    });

    it('should require idempotency key for transfers', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      await expect(
        service.transfer({
          fromWalletId: wallet1.id,
          toWalletId: wallet2.id,
          amount: '100.00',
          idempotencyKey: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing transaction for duplicate idempotency key', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      const result1 = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      const result2 = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });
      expect(result2.idempotencyKey).toBe(result1.idempotencyKey);
      expect(result2.debit.id).toBe(result1.debit.id);
      expect(result2.credit.id).toBe(result1.credit.id);

      const wallet = await service.getWalletById(wallet1.id);
      expect(wallet.balance).toBe('900.00');
    });

    it('should create TransactionLog in PENDING state before transaction', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      const log = await TransactionLog.findOne({ where: { idempotencyKey } });
      expect(log).toBeDefined();
      expect(log!.status).toBe(TransactionStatus.COMPLETED);
      expect(log!.amount).toBe('100.00');
    });

    it('should handle concurrent transfer attempts with same key', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      const result1 = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      const result2 = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      expect(result1.debit.id).toBe(result2.debit.id);

      const wallet = await service.getWalletById(wallet1.id);
      expect(wallet.balance).toBe('900.00');
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent double-spending with concurrent debits', async () => {
      const wallet = await service.createWallet({
        userId: 'user1',
        initialBalance: '100.00',
      });

      const debit1 = service.debitWallet({
        walletId: wallet.id,
        amount: '60.00',
        idempotencyKey: uuidv4(),
      });

      const debit2 = service.debitWallet({
        walletId: wallet.id,
        amount: '60.00',
        idempotencyKey: uuidv4(),
      });

      // One should succeed, one should fail
      const results = await Promise.allSettled([debit1, debit2]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      const finalWallet = await service.getWalletById(wallet.id);
      expect(finalWallet.balance).toBe('40.00');
    });

    it('should handle multiple concurrent transfers correctly', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const transfers: Promise<TransferResponse>[] = [];
      for (let i = 0; i < 5; i++) {
        transfers.push(
          service.transfer({
            fromWalletId: wallet1.id,
            toWalletId: wallet2.id,
            amount: '50.00',
            idempotencyKey: uuidv4(),
          }),
        );
      }

      await Promise.all(transfers);

      const finalWallet1 = await service.getWalletById(wallet1.id);
      const finalWallet2 = await service.getWalletById(wallet2.id);

      expect(finalWallet1.balance).toBe('750.00');
      expect(finalWallet2.balance).toBe('750.00');
    });
  });

  describe('Credit/Debit with Idempotency', () => {
    it('should handle credit with idempotency key', async () => {
      const wallet = await service.createWallet({
        userId: 'user1',
        initialBalance: '100.00',
      });

      const idempotencyKey = uuidv4();

      await service.creditWallet({
        walletId: wallet.id,
        amount: '50.00',
        idempotencyKey,
      });

      await service.creditWallet({
        walletId: wallet.id,
        amount: '50.00',
        idempotencyKey,
      });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('150.00');
    });

    it('should handle debit with idempotency key', async () => {
      const wallet = await service.createWallet({
        userId: 'user1',
        initialBalance: '100.00',
      });

      const idempotencyKey = uuidv4();
      await service.debitWallet({
        walletId: wallet.id,
        amount: '30.00',
        idempotencyKey,
      });

      // Duplicate debit (double-tap)
      await service.debitWallet({
        walletId: wallet.id,
        amount: '30.00',
        idempotencyKey,
      });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('70.00'); // Not 40.00
    });

    it('should throw ConflictException for pending transaction', async () => {
      const wallet = await service.createWallet({
        userId: 'user1',
        initialBalance: '100.00',
      });

      const idempotencyKey = uuidv4();

      // Create a pending transaction log manually
      await TransactionLog.create({
        idempotencyKey,
        operation: 'CREDIT',
        walletId: wallet.id,
        amount: '50.00',
        status: TransactionStatus.PENDING,
      });

      // Try to use the same key
      await expect(
        service.creditWallet({
          walletId: wallet.id,
          amount: '50.00',
          idempotencyKey,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Transaction Log Query', () => {
    it('should retrieve transaction by idempotency key', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      const transaction =
        await service.getTransactionByIdempotencyKey(idempotencyKey);

      expect(transaction.idempotencyKey).toBe(idempotencyKey);
      expect(transaction.operation).toBe('TRANSFER');
      expect(transaction.amount).toBe('100.00');
      expect(transaction.status).toBe(TransactionStatus.COMPLETED);
      expect(transaction.ledgers).toHaveLength(2);
    });
  });

  describe('Failed Transaction Handling', () => {
    it('should mark transaction as FAILED on insufficient funds', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '50.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      await expect(
        service.transfer({
          fromWalletId: wallet1.id,
          toWalletId: wallet2.id,
          amount: '100.00',
          idempotencyKey,
        }),
      ).rejects.toThrow(BadRequestException);

      // Transaction log should be marked as FAILED
      const log = await TransactionLog.findOne({ where: { idempotencyKey } });
      expect(log).toBeDefined();
      expect(log!.status).toBe(TransactionStatus.FAILED);
    });

    it('should not allow reuse of failed idempotency key', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '50.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      // First attempt fails (insufficient funds)
      await expect(
        service.transfer({
          fromWalletId: wallet1.id,
          toWalletId: wallet2.id,
          amount: '100.00',
          idempotencyKey,
        }),
      ).rejects.toThrow();

      // Second attempt with same key should fail
      await expect(
        service.transfer({
          fromWalletId: wallet1.id,
          toWalletId: wallet2.id,
          amount: '40.00',
          idempotencyKey,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle mobile app double-tap scenario', async () => {
      const wallet1 = await service.createWallet({
        userId: 'mobile_user',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'merchant',
        initialBalance: '0.00',
      });

      const idempotencyKey = uuidv4();

      // User taps "Pay" button twice quickly
      const transfer1 = service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '50.00',
        idempotencyKey,
      });

      const transfer2 = service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '50.00',
        idempotencyKey,
      });

      // Both complete successfully but only one transaction occurs
      await Promise.all([transfer1, transfer2]);

      const userWallet = await service.getWalletById(wallet1.id);
      const merchantWallet = await service.getWalletById(wallet2.id);

      expect(userWallet.balance).toBe('950.00');
      expect(merchantWallet.balance).toBe('50.00');
    });

    it('should handle network retry scenario', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user1',
        initialBalance: '1000.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user2',
        initialBalance: '500.00',
      });

      const idempotencyKey = uuidv4();

      // First request succeeds
      const result1 = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      // Client times out and retries (simulated by second call)
      const result2 = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '100.00',
        idempotencyKey,
      });

      // Both return same transaction
      expect(result1.transactionLogId).toBe(result2.transactionLogId);

      // Only one debit occurred
      const wallet = await service.getWalletById(wallet1.id);
      expect(wallet.balance).toBe('900.00');
    });
  });
});
