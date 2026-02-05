import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletService, TransferResponse } from './wallet.service';
import { Wallet } from '../models/wallet.model';
import { Ledger, TransactionType } from '../models/ledger.model';
import { TransactionLog } from '../models/transaction-log.model';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { RedisService } from './redis.service';

describe('WalletService', () => {
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
          sync: { force: true }, // Recreate tables for testing
        }),
        SequelizeModule.forFeature([Wallet, Ledger, TransactionLog]),
      ],
      providers: [
        WalletService,
        // in-memory RedisService mock for tests
        {
          provide: RedisService,
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
    // Clear all data before each test
    await Ledger.destroy({ where: {}, truncate: true, cascade: true });
    await Wallet.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('createWallet', () => {
    it('should create a wallet with zero initial balance', async () => {
      const wallet = await service.createWallet({ userId: 'user1' });

      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe('user1');
      expect(wallet.balance).toBe('0.00');
    });

    it('should create a wallet with initial balance', async () => {
      const wallet = await service.createWallet({
        userId: 'user2',
        initialBalance: '100.50',
      });

      expect(wallet.balance).toBe('100.50');

      // an initial ledger entry
      const ledgers = await Ledger.findAll({ where: { walletId: wallet.id } });
      expect(ledgers.length).toBe(1);
      expect(ledgers[0].type).toBe(TransactionType.CREDIT);
      expect(ledgers[0].amount).toBe('100.50');
    });

    it('should reject invalid initial balance', async () => {
      await expect(
        service.createWallet({ userId: 'user3', initialBalance: 'invalid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative initial balance', async () => {
      await expect(
        service.createWallet({ userId: 'user4', initialBalance: '-100.00' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate wallets for same user', async () => {
      await service.createWallet({ userId: 'user5' });

      await expect(service.createWallet({ userId: 'user5' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getWalletById', () => {
    it('should retrieve wallet by ID', async () => {
      const created = await service.createWallet({ userId: 'user6' });
      const retrieved = await service.getWalletById(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.userId).toBe('user6');
    });

    it('should throw NotFoundException for non-existent wallet', async () => {
      await expect(
        service.getWalletById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWalletByUserId', () => {
    it('should retrieve wallet by user ID', async () => {
      await service.createWallet({ userId: 'user7' });
      const wallet = await service.getWalletByUserId('user7');

      expect(wallet.userId).toBe('user7');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(service.getWalletByUserId('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('creditWallet', () => {
    it('should credit wallet successfully', async () => {
      const wallet = await service.createWallet({
        userId: 'user8',
        initialBalance: '100.00',
      });

      const ledger = await service.creditWallet({
        walletId: wallet.id,
        amount: '50.00',
        description: 'Test credit',
      });

      expect(ledger.type).toBe(TransactionType.CREDIT);
      expect(ledger.amount).toBe('50.00');
      expect(ledger.balanceBefore).toBe('100.00');
      expect(ledger.balanceAfter).toBe('150.00');

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('150.00');
    });

    it('should handle decimal amounts correctly', async () => {
      const wallet = await service.createWallet({
        userId: 'user9',
        initialBalance: '100.11',
      });

      await service.creditWallet({
        walletId: wallet.id,
        amount: '0.22',
      });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('100.33');
    });

    it('should reject invalid amounts', async () => {
      const wallet = await service.createWallet({ userId: 'user10' });

      await expect(
        service.creditWallet({
          walletId: wallet.id,
          amount: 'invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject zero or negative amounts', async () => {
      const wallet = await service.createWallet({ userId: 'user11' });

      await expect(
        service.creditWallet({
          walletId: wallet.id,
          amount: '0.00',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.creditWallet({
          walletId: wallet.id,
          amount: '-10.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle large amounts', async () => {
      const wallet = await service.createWallet({ userId: 'user12' });

      await service.creditWallet({
        walletId: wallet.id,
        amount: '999999999999.99',
      });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('999999999999.99');
    });
  });

  describe('debitWallet', () => {
    it('should debit wallet successfully', async () => {
      const wallet = await service.createWallet({
        userId: 'user13',
        initialBalance: '100.00',
      });

      const ledger = await service.debitWallet({
        walletId: wallet.id,
        amount: '30.00',
        description: 'Test debit',
      });

      expect(ledger.type).toBe(TransactionType.DEBIT);
      expect(ledger.amount).toBe('30.00');
      expect(ledger.balanceBefore).toBe('100.00');
      expect(ledger.balanceAfter).toBe('70.00');

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('70.00');
    });

    it('should prevent overdraft', async () => {
      const wallet = await service.createWallet({
        userId: 'user14',
        initialBalance: '50.00',
      });

      await expect(
        service.debitWallet({
          walletId: wallet.id,
          amount: '100.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle exact balance debit', async () => {
      const wallet = await service.createWallet({
        userId: 'user15',
        initialBalance: '100.00',
      });

      await service.debitWallet({
        walletId: wallet.id,
        amount: '100.00',
      });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('0.00');
    });

    it('should handle small decimal amounts', async () => {
      const wallet = await service.createWallet({
        userId: 'user16',
        initialBalance: '1.00',
      });

      await service.debitWallet({
        walletId: wallet.id,
        amount: '0.01',
      });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('0.99');
    });
  });

  describe('transfer', () => {
    it('should transfer between wallets successfully', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user17',
        initialBalance: '100.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user18',
        initialBalance: '50.00',
      });

      const result = await service.transfer({
        fromWalletId: wallet1.id,
        toWalletId: wallet2.id,
        amount: '25.00',
        description: 'Test transfer',
        idempotencyKey: 'test-transfer-success-1',
      });

      expect(result.debit.type).toBe(TransactionType.DEBIT);
      expect(result.debit.amount).toBe('25.00');
      expect(result.debit.balanceAfter).toBe('75.00');

      expect(result.credit.type).toBe(TransactionType.CREDIT);
      expect(result.credit.amount).toBe('25.00');
      expect(result.credit.balanceAfter).toBe('75.00');

      const updatedWallet1 = await service.getWalletById(wallet1.id);
      const updatedWallet2 = await service.getWalletById(wallet2.id);

      expect(updatedWallet1.balance).toBe('75.00');
      expect(updatedWallet2.balance).toBe('75.00');
    });

    it('should prevent transfer with insufficient funds', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user19',
        initialBalance: '50.00',
      });

      const wallet2 = await service.createWallet({
        userId: 'user20',
      });

      await expect(
        service.transfer({
          fromWalletId: wallet1.id,
          toWalletId: wallet2.id,
          amount: '25.00',
          description: 'Test transfer',
          idempotencyKey: 'test-transfer-success-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent transfer to same wallet', async () => {
      const wallet = await service.createWallet({
        userId: 'user21',
        initialBalance: '100.00',
      });

      await expect(
        service.transfer({
          fromWalletId: wallet.id,
          toWalletId: wallet.id,
          amount: '25.00',
          description: 'Test transfer',
          idempotencyKey: 'test-transfer-success-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback on error (transaction atomicity)', async () => {
      const wallet1 = await service.createWallet({
        userId: 'user22',
        initialBalance: '100.00',
      });

      // Try to transfer to non-existent wallet
      await expect(
        service.transfer({
          fromWalletId: wallet1.id,
          toWalletId: '00000000-0000-0000-0000-000000000000',
          amount: '50.00',
          idempotencyKey: 'test-transfer-error-1',
        }),
      ).rejects.toThrow();

      // Original wallet should be unchanged
      const wallet = await service.getWalletById(wallet1.id);
      expect(wallet.balance).toBe('100.00');
    });
  });

  describe('getBalance', () => {
    it('should get current balance', async () => {
      const wallet = await service.createWallet({
        userId: 'user23',
        initialBalance: '123.45',
      });

      const balance = await service.getBalance(wallet.id);
      expect(balance).toBe('123.45');
    });
  });

  describe('getTransactionHistory', () => {
    it('should retrieve transaction history', async () => {
      const wallet = await service.createWallet({
        userId: 'user24',
        initialBalance: '100.00',
      });

      await service.creditWallet({ walletId: wallet.id, amount: '50.00' });
      await service.debitWallet({ walletId: wallet.id, amount: '20.00' });

      const history = await service.getTransactionHistory(wallet.id);

      expect(history.total).toBe(3); // Initial + credit + debit
      expect(history.transactions.length).toBe(3);
    });

    it('should support pagination', async () => {
      const wallet = await service.createWallet({
        userId: 'user25',
        initialBalance: '100.00',
      });

      // Create multiple transactions
      for (let i = 0; i < 10; i++) {
        await service.creditWallet({ walletId: wallet.id, amount: '1.00' });
      }

      const page1 = await service.getTransactionHistory(wallet.id, 5, 0);
      const page2 = await service.getTransactionHistory(wallet.id, 5, 5);

      expect(page1.transactions.length).toBe(5);
      expect(page2.transactions.length).toBe(5);
      expect(page1.total).toBe(11); // Initial + 10 credits
    });
  });

  describe('Concurrent Transactions', () => {
    it('should handle concurrent credits correctly', async () => {
      const wallet = await service.createWallet({
        userId: 'user26',
        initialBalance: '0.00',
      });

      // Simulate concurrent credits

      const promises: Promise<Ledger>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.creditWallet({
            walletId: wallet.id,
            amount: '10.00',
          }),
        );
      }
      await Promise.all(promises);

      await Promise.all(promises);

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('100.00');
    });

    it('should handle concurrent debits correctly', async () => {
      const wallet = await service.createWallet({
        userId: 'user27',
        initialBalance: '100.00',
      });

      // Simulate concurrent debits
      const promises: Promise<Ledger>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.debitWallet({
            walletId: wallet.id,
            amount: '5.00',
          }),
        );
      }

      await Promise.all(promises);

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('50.00');
    });
  });

  describe('Precision Edge Cases', () => {
    it('should maintain precision with many small transactions', async () => {
      const wallet = await service.createWallet({
        userId: 'user28',
        initialBalance: '0.00',
      });

      // Add $0.01 one hundred times
      for (let i = 0; i < 100; i++) {
        await service.creditWallet({
          walletId: wallet.id,
          amount: '0.01',
        });
      }

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('1.00'); // Not 0.99999... or 1.00000...1
    });

    it('should handle floating-point problem amounts', async () => {
      const wallet = await service.createWallet({
        userId: 'user29',
        initialBalance: '0.00',
      });

      // The classic 0.1 + 0.2 = 0.30000000000000004 problem
      await service.creditWallet({ walletId: wallet.id, amount: '0.10' });
      await service.creditWallet({ walletId: wallet.id, amount: '0.20' });

      const updatedWallet = await service.getWalletById(wallet.id);
      expect(updatedWallet.balance).toBe('0.30');
    });
  });
});
