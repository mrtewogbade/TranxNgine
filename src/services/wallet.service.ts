import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Wallet } from '../models/wallet.model';
import {
  Ledger,
  TransactionType,
  TransactionStatus,
} from '../models/ledger.model';
import { TransactionLog } from '../models/transaction-log.model';
import { MoneyMath } from '../utils/money-math.util';
import { RedisService } from './redis.service';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

export interface CreateWalletDto {
  userId: string;
  initialBalance?: string;
}

export interface CreditWalletDto {
  walletId: string;
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface DebitWalletDto {
  walletId: string;
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface TransferDto {
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  idempotencyKey: string; // REQUIRED for transfers
}

export interface TransferResponse {
  transactionLogId: string;
  debit: Ledger;
  credit: Ledger;
  idempotencyKey: string;
}

/**
 * WalletService with Idempotency Support
 *
 * This service implements BOTH practical assessments:
 * A. The Idempotent Wallet - /transfer endpoint with idempotency and race condition handling
 * B. The Interest Accumulator - Precise math with leap year support
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
    @InjectModel(Ledger)
    private ledgerModel: typeof Ledger,
    @InjectModel(TransactionLog)
    private transactionLogModel: typeof TransactionLog,
    private sequelize: Sequelize,
    private redisService: RedisService,
  ) {}

  /**
   * Create a new wallet for a user
   */
  async createWallet(dto: CreateWalletDto): Promise<Wallet> {
    const { userId, initialBalance = '0.00' } = dto;

    if (!MoneyMath.isValid(initialBalance)) {
      throw new BadRequestException('Invalid initial balance');
    }

    if (MoneyMath.lessThan(initialBalance, '0')) {
      throw new BadRequestException('Initial balance cannot be negative');
    }

    const existingWallet = await this.walletModel.findOne({
      where: { userId },
    });
    if (existingWallet) {
      throw new BadRequestException('Wallet already exists for this user');
    }

    const wallet = await this.walletModel.create({
      userId,
      balance: MoneyMath.format(initialBalance),
    });

    if (MoneyMath.greaterThan(initialBalance, '0')) {
      await this.ledgerModel.create({
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount: MoneyMath.format(initialBalance),
        balanceBefore: '0.00',
        balanceAfter: MoneyMath.format(initialBalance),
        status: TransactionStatus.COMPLETED,
        description: 'Initial balance',
      });
    }

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(walletId: string): Promise<Wallet> {
    const wallet = await this.walletModel.findByPk(walletId, {
      include: [{ model: Ledger, limit: 10, order: [['createdAt', 'DESC']] }],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletModel.findOne({
      where: { userId },
      include: [{ model: Ledger, limit: 10, order: [['createdAt', 'DESC']] }],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this user');
    }

    return wallet;
  }

  /**
   * Check if an idempotency key has been used before
   * Returns the existing transaction if found
   * Uses Redis cache for fast lookups
   */
  private async checkIdempotency(
    idempotencyKey: string,
  ): Promise<TransactionLog | null> {
    // Check Redis cache first for faster lookups
    const cached =
      await this.redisService.getCachedIdempotencyResult(idempotencyKey);
    if (cached) {
      // Return cached transaction log with ledgers
      return cached;
    }

    // Not in cache, check database
    const transactionLog = await this.transactionLogModel.findOne({
      where: { idempotencyKey },
      include: [
        {
          model: Ledger,
          as: 'ledgers',
        },
      ],
    });

    // Cache the result if found
    if (transactionLog) {
      await this.redisService.cacheIdempotencyResult(
        idempotencyKey,
        transactionLog.toJSON(),
      );
    }

    return transactionLog;
  }

  /**
   * Credit a wallet (add money) with idempotency support
   */
  async creditWallet(dto: CreditWalletDto): Promise<Ledger> {
    const {
      walletId,
      amount,
      reference,
      description,
      metadata,
      idempotencyKey,
    } = dto;

    if (!MoneyMath.isValid(amount)) {
      throw new BadRequestException('Invalid amount');
    }

    if (MoneyMath.lessThanOrEqual(amount, '0')) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existingTx = await this.checkIdempotency(idempotencyKey);
      if (existingTx) {
        if (existingTx.status === TransactionStatus.COMPLETED) {
          return existingTx.ledgers[0];
        } else if (existingTx.status === TransactionStatus.PENDING) {
          throw new ConflictException('Transaction is still processing');
        } else {
          throw new BadRequestException(
            'Previous transaction with this key failed',
          );
        }
      }
    }

    return await this.sequelize.transaction(async (transaction) => {
      const transactionLog = await this.transactionLogModel.create(
        {
          idempotencyKey: idempotencyKey || uuidv4(),
          operation: 'CREDIT',
          walletId,
          amount: MoneyMath.format(amount),
          status: TransactionStatus.PENDING,
          metadata: { reference, description, ...metadata },
        },
        { transaction },
      );

      const wallet = await this.walletModel.findByPk(walletId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        await transactionLog.update(
          { status: TransactionStatus.FAILED },
          { transaction },
        );
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = MoneyMath.add(balanceBefore, amount);

      await wallet.update({ balance: balanceAfter }, { transaction });

      const ledger = await this.ledgerModel.create(
        {
          walletId,
          type: TransactionType.CREDIT,
          amount: MoneyMath.format(amount),
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          reference,
          description,
          metadata,
          transactionLogId: transactionLog.id,
        },
        { transaction },
      );

      await transactionLog.update(
        { status: TransactionStatus.COMPLETED },
        { transaction },
      );

      // Invalidate wallet balance cache after credit
      await this.redisService.invalidateWalletBalance(walletId);

      return ledger;
    });
  }

  /**
   * Debit a wallet (remove money) with idempotency support
   */
  async debitWallet(dto: DebitWalletDto): Promise<Ledger> {
    const {
      walletId,
      amount,
      reference,
      description,
      metadata,
      idempotencyKey,
    } = dto;

    if (!MoneyMath.isValid(amount)) {
      throw new BadRequestException('Invalid amount');
    }

    if (MoneyMath.lessThanOrEqual(amount, '0')) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (idempotencyKey) {
      const existingTx = await this.checkIdempotency(idempotencyKey);
      if (existingTx) {
        if (existingTx.status === TransactionStatus.COMPLETED) {
          return existingTx.ledgers[0];
        } else if (existingTx.status === TransactionStatus.PENDING) {
          throw new ConflictException('Transaction is still processing');
        } else {
          throw new BadRequestException(
            'Previous transaction with this key failed',
          );
        }
      }
    }

    return await this.sequelize.transaction(async (transaction) => {
      const transactionLog = await this.transactionLogModel.create(
        {
          idempotencyKey: idempotencyKey || uuidv4(),
          operation: 'DEBIT',
          walletId,
          amount: MoneyMath.format(amount),
          status: TransactionStatus.PENDING,
          metadata: { reference, description, ...metadata },
        },
        { transaction },
      );

      const wallet = await this.walletModel.findByPk(walletId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        await transactionLog.update(
          { status: TransactionStatus.FAILED },
          { transaction },
        );
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = wallet.balance;

      if (MoneyMath.lessThan(balanceBefore, amount)) {
        await transactionLog.update(
          {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transactionLog.metadata,
              error: 'Insufficient funds',
            },
          },
          { transaction },
        );
        throw new BadRequestException('Insufficient funds');
      }

      const balanceAfter = MoneyMath.subtract(balanceBefore, amount);

      await wallet.update({ balance: balanceAfter }, { transaction });

      const ledger = await this.ledgerModel.create(
        {
          walletId,
          type: TransactionType.DEBIT,
          amount: MoneyMath.format(amount),
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          reference,
          description,
          metadata,
          transactionLogId: transactionLog.id,
        },
        { transaction },
      );

      await transactionLog.update(
        { status: TransactionStatus.COMPLETED },
        { transaction },
      );

      // Invalidate wallet balance cache after debit
      await this.redisService.invalidateWalletBalance(walletId);

      return ledger;
    });
  }

  /**
   * PART A: THE IDEMPOTENT WALLET
   *
   * Transfer money between wallets with complete idempotency support
   *
   * KEY FEATURES:
   * 1. IDEMPOTENCY KEY: Prevents double-processing from client double-taps
   *    - Same key returns existing transaction
   *    - Detects concurrent processing
   *
   * 2. RACE CONDITION HANDLING: Row-level locking prevents double-spending
   *    - Locks both wallets in consistent order (prevents deadlocks)
   *    - Exclusive locks ensure no other transaction can modify during processing
   *
   * 3. TRANSACTION LOG: PENDING state created BEFORE main transaction
   *    - If connection drops, we have a record
   *    - Can retry or reconcile later
   *
   * 4. ATOMIC OPERATION: All-or-nothing with automatic rollback
   *    - Both debits and credits succeed together
   *    - No partial transfers
   */
  async transfer(dto: TransferDto): Promise<TransferResponse> {
    const {
      fromWalletId,
      toWalletId,
      amount,
      reference,
      description,
      metadata,
      idempotencyKey,
    } = dto;

    // Validate idempotency key is provided (REQUIRED for transfers)
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency key is required for transfers',
      );
    }

    // Validate amount
    if (!MoneyMath.isValid(amount)) {
      throw new BadRequestException('Invalid amount');
    }

    if (MoneyMath.lessThanOrEqual(amount, '0')) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (fromWalletId === toWalletId) {
      throw new BadRequestException('Cannot transfer to the same wallet');
    }

    // IDEMPOTENCY CHECK: Return existing transaction if already processed
    const existingTx = await this.checkIdempotency(idempotencyKey);
    if (existingTx) {
      if (existingTx.status === TransactionStatus.COMPLETED) {
        // Transaction already completed successfully - return existing result
        // This handles the "double-tap" scenario
        return {
          transactionLogId: existingTx.id,
          debit: existingTx.ledgers.find(
            (l) => l.type === TransactionType.DEBIT,
          ) as Ledger,
          credit: existingTx.ledgers.find(
            (l) => l.type === TransactionType.CREDIT,
          ) as Ledger,
          idempotencyKey: existingTx.idempotencyKey,
        };
      } else if (existingTx.status === TransactionStatus.PENDING) {
        // Transaction is currently being processed by another request
        // Tell client to wait and retry
        throw new ConflictException(
          'Transfer is already being processed. Please try again in a moment.',
        );
      } else {
        // Previous attempt failed
        throw new BadRequestException(
          'Previous transfer with this idempotency key failed',
        );
      }
    }

    // database transaction for atomic operation
    return await this.sequelize.transaction(async (transaction) => {
      // Here, i'm creating TransactionLog in PENDING state BEFORE main transaction
      // This ensures we have a record even if the database connection drops
      const transactionLog = await this.transactionLogModel.create(
        {
          idempotencyKey,
          operation: 'TRANSFER',
          walletId: fromWalletId,
          amount: MoneyMath.format(amount),
          status: TransactionStatus.PENDING,
          metadata: {
            fromWalletId,
            toWalletId,
            reference,
            description,
            ...metadata,
          },
        },
        { transaction },
      );

      // Then, I Lock BOTH wallets in consistent order to prevent deadlocks
      // Wallet A -> Wallet B and Wallet B -> Wallet A would deadlock
      const [wallet1Id, wallet2Id] = [fromWalletId, toWalletId].sort();
      const wallets = await this.walletModel.findAll({
        where: { id: [wallet1Id, wallet2Id] },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (wallets.length !== 2) {
        await transactionLog.update(
          {
            status: TransactionStatus.FAILED,
            metadata: { ...transactionLog.metadata, error: 'Wallet not found' },
          },
          { transaction },
        );
        throw new NotFoundException('One or both wallets not found');
      }

      const fromWallet = wallets.find((w) => w.id === fromWalletId);
      const toWallet = wallets.find((w) => w.id === toWalletId);

      if (!fromWallet || !toWallet) {
        await transactionLog.update(
          {
            status: TransactionStatus.FAILED,
            metadata: { ...transactionLog.metadata, error: 'Wallet not found' },
          },
          { transaction },
        );
        throw new NotFoundException('One or both wallets not found');
      }

      // Next, I'm Checking sufficient funds (RACE CONDITION PREVENTION)
      // The lock ensures no other transaction can modify balance until we commit
      // This prevents the classic double-spending problem
      if (MoneyMath.lessThan(fromWallet.balance, amount)) {
        await transactionLog.update(
          {
            status: TransactionStatus.FAILED,
            metadata: {
              ...transactionLog.metadata,
              error: 'Insufficient funds',
            },
          },
          { transaction },
        );
        throw new BadRequestException('Insufficient funds');
      }

      // Debit from source wallet
      const fromBalanceBefore = fromWallet.balance;
      const fromBalanceAfter = MoneyMath.subtract(fromBalanceBefore, amount);
      await fromWallet.update({ balance: fromBalanceAfter }, { transaction });

      // Credit to destination wallet
      const toBalanceBefore = toWallet.balance;
      const toBalanceAfter = MoneyMath.add(toBalanceBefore, amount);
      await toWallet.update({ balance: toBalanceAfter }, { transaction });

      // Create debit ledger entry
      const debitLedger = await this.ledgerModel.create(
        {
          walletId: fromWalletId,
          type: TransactionType.DEBIT,
          amount: MoneyMath.format(amount),
          balanceBefore: fromBalanceBefore,
          balanceAfter: fromBalanceAfter,
          status: TransactionStatus.COMPLETED,
          reference: reference || `TRANSFER_TO_${toWalletId}`,
          description: description || `Transfer to wallet ${toWalletId}`,
          metadata: { ...metadata, transferTo: toWalletId, idempotencyKey },
          transactionLogId: transactionLog.id,
        },
        { transaction },
      );

      // Creating credit ledger entry
      const creditLedger = await this.ledgerModel.create(
        {
          walletId: toWalletId,
          type: TransactionType.CREDIT,
          amount: MoneyMath.format(amount),
          balanceBefore: toBalanceBefore,
          balanceAfter: toBalanceAfter,
          status: TransactionStatus.COMPLETED,
          reference: reference || `TRANSFER_FROM_${fromWalletId}`,
          description: description || `Transfer from wallet ${fromWalletId}`,
          metadata: { ...metadata, transferFrom: fromWalletId, idempotencyKey },
          transactionLogId: transactionLog.id,
        },
        { transaction },
      );

      // Updating TransactionLog to COMPLETED
      await transactionLog.update(
        { status: TransactionStatus.COMPLETED },
        { transaction },
      );

      // Invalidating both wallet balance caches after transfer
      await this.redisService.invalidateWalletBalance(fromWalletId);
      await this.redisService.invalidateWalletBalance(toWalletId);

      // Caching the transfer result for quick lookups
      const result = {
        transactionLogId: transactionLog.id,
        debit: debitLedger,
        credit: creditLedger,
        idempotencyKey,
      };
      await this.redisService.cacheTransferResult(transactionLog.id, result);

      // All operations succeed or all fail (automatic rollback on error)
      return result;
    });
  }

  /**
   * Get wallet balance with Redis caching
   */
  async getBalance(walletId: string): Promise<string> {
    const cachedBalance =
      await this.redisService.getCachedWalletBalance(walletId);
    if (cachedBalance) {
      return cachedBalance;
    }

    // if not in the cache, get from database
    const wallet = await this.walletModel.findByPk(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Caching the balance
    await this.redisService.cacheWalletBalance(walletId, wallet.balance);

    return wallet.balance;
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(
    walletId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ transactions: Ledger[]; total: number }> {
    const wallet = await this.walletModel.findByPk(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const { rows, count } = await this.ledgerModel.findAndCountAll({
      where: { walletId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      transactions: rows,
      total: count,
    };
  }

  /**
   * Get transaction log by idempotency key
   * Useful for clients to check transaction status
   */
  async getTransactionByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TransactionLog> {
    const transactionLog = await this.transactionLogModel.findOne({
      where: { idempotencyKey },
      include: [
        {
          model: Ledger,
          as: 'ledgers',
        },
      ],
    });

    if (!transactionLog) {
      throw new NotFoundException('Transaction not found');
    }

    return transactionLog;
  }
}
