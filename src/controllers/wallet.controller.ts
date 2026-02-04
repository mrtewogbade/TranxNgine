import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';

class CreateWalletDto {
  userId: string;
  initialBalance?: string;
}

class CreditWalletDto {
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

class DebitWalletDto {
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

class TransferDto {
  toWalletId: string;
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * WalletController
 * REST API endpoints for wallet operations with idempotency support
 * Rate limited to prevent abuse (100 requests/minute per IP)
 */
@Controller('wallets')
@UseGuards(RateLimitGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Create a new wallet
   * POST /wallets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const wallet = await this.walletService.createWallet(createWalletDto);
    return {
      success: true,
      data: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        createdAt: wallet.createdAt,
      },
    };
  }

  /**
   * Get wallet by ID
   * GET /wallets/:id
   */
  @Get(':id')
  async getWallet(@Param('id') id: string) {
    const wallet = await this.walletService.getWalletById(id);
    return {
      success: true,
      data: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    };
  }

  /**
   * Get wallet by user ID
   * GET /wallets/user/:userId
   */
  @Get('user/:userId')
  async getWalletByUserId(@Param('userId') userId: string) {
    const wallet = await this.walletService.getWalletByUserId(userId);
    return {
      success: true,
      data: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    };
  }

  /**
   * Get wallet balance
   * GET /wallets/:id/balance
   */
  @Get(':id/balance')
  async getBalance(@Param('id') id: string) {
    const balance = await this.walletService.getBalance(id);
    return {
      success: true,
      data: {
        balance,
      },
    };
  }

  /**
   * Credit a wallet with idempotency support
   * POST /wallets/:id/credit
   * 
   * Optional Header: X-Idempotency-Key
   */
  @Post(':id/credit')
  async creditWallet(
    @Param('id') id: string,
    @Body() creditWalletDto: CreditWalletDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const ledger = await this.walletService.creditWallet({
      walletId: id,
      ...creditWalletDto,
      idempotencyKey,
    });

    return {
      success: true,
      data: {
        transactionId: ledger.id,
        type: ledger.type,
        amount: ledger.amount,
        balanceBefore: ledger.balanceBefore,
        balanceAfter: ledger.balanceAfter,
        status: ledger.status,
        createdAt: ledger.createdAt,
      },
    };
  }

  /**
   * Debit a wallet with idempotency support
   * POST /wallets/:id/debit
   * 
   * Optional Header: X-Idempotency-Key
   */
  @Post(':id/debit')
  async debitWallet(
    @Param('id') id: string,
    @Body() debitWalletDto: DebitWalletDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const ledger = await this.walletService.debitWallet({
      walletId: id,
      ...debitWalletDto,
      idempotencyKey,
    });

    return {
      success: true,
      data: {
        transactionId: ledger.id,
        type: ledger.type,
        amount: ledger.amount,
        balanceBefore: ledger.balanceBefore,
        balanceAfter: ledger.balanceAfter,
        status: ledger.status,
        createdAt: ledger.createdAt,
      },
    };
  }

  /**
   * Transfer between wallets with REQUIRED idempotency support
   * POST /wallets/:id/transfer
   * 
   * REQUIRED Header: X-Idempotency-Key
   * 
   * This is the main endpoint for PART A: The Idempotent Wallet
   * 
   * Features:
   * - Prevents double-spending through row-level locking
   * - Idempotency key prevents duplicate transactions from double-taps
   * - TransactionLog created in PENDING state before main transaction
   * - Atomic operation with automatic rollback on failure
   */
  @Post(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() transferDto: TransferDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    const result = await this.walletService.transfer({
      fromWalletId: id,
      idempotencyKey,
      ...transferDto,
    });

    return {
      success: true,
      data: {
        transactionLogId: result.transactionLogId,
        idempotencyKey: result.idempotencyKey,
        debit: {
          transactionId: result.debit.id,
          walletId: result.debit.walletId,
          amount: result.debit.amount,
          balanceAfter: result.debit.balanceAfter,
        },
        credit: {
          transactionId: result.credit.id,
          walletId: result.credit.walletId,
          amount: result.credit.amount,
          balanceAfter: result.credit.balanceAfter,
        },
      },
    };
  }

  /**
   * Get transaction by idempotency key
   * GET /wallets/transactions/by-key/:key
   * 
   * Useful for clients to check if a transaction was processed
   */
  @Get('transactions/by-key/:key')
  async getTransactionByKey(@Param('key') key: string) {
    const transaction = await this.walletService.getTransactionByIdempotencyKey(key);
    return {
      success: true,
      data: {
        id: transaction.id,
        idempotencyKey: transaction.idempotencyKey,
        operation: transaction.operation,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        ledgers: transaction.ledgers,
      },
    };
  }

  /**
   * Get transaction history
   * GET /wallets/:id/transactions
   */
  @Get(':id/transactions')
  async getTransactionHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.walletService.getTransactionHistory(
      id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );

    return {
      success: true,
      data: {
        transactions: result.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceBefore: t.balanceBefore,
          balanceAfter: t.balanceAfter,
          status: t.status,
          reference: t.reference,
          description: t.description,
          metadata: t.metadata,
          createdAt: t.createdAt,
        })),
        total: result.total,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      },
    };
  }
}
