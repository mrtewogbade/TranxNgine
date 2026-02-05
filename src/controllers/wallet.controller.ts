// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   Query,
//   HttpCode,
//   HttpStatus,
//   Headers,
//   UseGuards,
// } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiOkResponse, ApiBody } from '@nestjs/swagger';
// import { WalletService } from '../services/wallet.service';
// import { RateLimitGuard } from '../guards/rate-limit.guard';

// class CreateWalletDto {
//   userId: string;
//   initialBalance?: string;
// }

// class CreditWalletDto {
//   amount: string;
//   reference?: string;
//   description?: string;
//   metadata?: Record<string, any>;
// }

// class DebitWalletDto {
//   amount: string;
//   reference?: string;
//   description?: string;
//   metadata?: Record<string, any>;
// }

// class TransferDto {
//   toWalletId: string;
//   amount: string;
//   reference?: string;
//   description?: string;
//   metadata?: Record<string, any>;
// }

// /**
//  * WalletController
//  * REST API endpoints for wallet operations with idempotency support
//  * Rate limited to prevent abuse (100 requests/minute per IP)
//  */
// @ApiTags('Wallets')
// @Controller('wallets')
// @UseGuards(RateLimitGuard)
// export class WalletController {
//   constructor(private readonly walletService: WalletService) {}

//   /**
//    * Create a new wallet
//    * POST /wallets
//    */
//   @ApiOperation({ summary: 'Create a new wallet' })
//   @ApiBody({ type: CreateWalletDto })
//   @ApiOkResponse({
//     description: 'The wallet has been successfully created.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           id: 'uuid',
//           userId: 'user-123',
//           balance: '1000.00',
//           createdAt: '2024-01-01T00:00:00.000Z',
//         },
//       },
//     },
//   })
//   @Post()
//   @HttpCode(HttpStatus.CREATED)
//   async createWallet(@Body() createWalletDto: CreateWalletDto) {
//     const wallet = await this.walletService.createWallet(createWalletDto);
//     return {
//       success: true,
//       data: {
//         id: wallet.id,
//         userId: wallet.userId,
//         balance: wallet.balance,
//         createdAt: wallet.createdAt,
//       },
//     };
//   }

//   /**
//    * Get wallet by ID
//    * GET /wallets/:id
//    */
//   @ApiOperation({ summary: 'Get wallet by ID' })
//   @ApiOkResponse({
//     description: 'The wallet details.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           id: 'uuid',
//           userId: 'user-123',
//           balance: '1000.00',
//           createdAt: '2024-01-01T00:00:00.000Z',
//           updatedAt: '2024-01-02T00:00:00.000Z',
//         },
//       },
//     },
//   })
//   @Get(':id')
//   async getWallet(@Param('id') id: string) {
//     const wallet = await this.walletService.getWalletById(id);
//     return {
//       success: true,
//       data: {
//         id: wallet.id,
//         userId: wallet.userId,
//         balance: wallet.balance,
//         createdAt: wallet.createdAt,
//         updatedAt: wallet.updatedAt,
//       },
//     };
//   }

//   /**
//    * Get wallet by user ID
//    * GET /wallets/user/:userId
//    */
//   @ApiOperation({ summary: 'Get wallet by user ID' })
//   @ApiOkResponse({
//     description: 'The wallet details.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           id: 'uuid',
//           userId: 'user-123',
//           balance: '1000.00',
//           createdAt: '2024-01-01T00:00:00.000Z',
//           updatedAt: '2024-01-02T00:00:00.000Z',
//         },
//       },
//     },
//   })
//   @Get('user/:userId')
//   async getWalletByUserId(@Param('userId') userId: string) {
//     const wallet = await this.walletService.getWalletByUserId(userId);
//     return {
//       success: true,
//       data: {
//         id: wallet.id,
//         userId: wallet.userId,
//         balance: wallet.balance,
//         createdAt: wallet.createdAt,
//         updatedAt: wallet.updatedAt,
//       },
//     };
//   }

//   /**
//    * Get wallet balance
//    * GET /wallets/:id/balance
//    */
//   @ApiOperation({ summary: 'Get wallet balance' })
//   @ApiOkResponse({
//     description: 'The wallet balance.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           balance: '1000.00',
//         },
//       },
//     },
//   })
//   @Get(':id/balance')
//   async getBalance(@Param('id') id: string) {
//     const balance = await this.walletService.getBalance(id);
//     return {
//       success: true,
//       data: {
//         balance,
//       },
//     };
//   }

//   /**
//    * Credit a wallet with idempotency support
//    * POST /wallets/:id/credit
//    *
//    * Optional Header: X-Idempotency-Key
//    */
//   @ApiOperation({ summary: 'Credit a wallet with idempotency support' })
//   @ApiBody({ type: CreditWalletDto })
//   @ApiOkResponse({
//     description: 'The wallet has been successfully credited.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           transactionId: 'uuid',
//           type: 'credit',
//           amount: '100.00',
//           balanceBefore: '900.00',
//           balanceAfter: '1000.00',
//           status: 'completed',
//           createdAt: '2024-01-01T00:00:00.000Z',
//         },
//       },
//     },
//   })
//   @Post(':id/credit')
//   async creditWallet(
//     @Param('id') id: string,
//     @Body() creditWalletDto: CreditWalletDto,
//     @Headers('x-idempotency-key') idempotencyKey?: string,
//   ) {
//     const ledger = await this.walletService.creditWallet({
//       walletId: id,
//       ...creditWalletDto,
//       idempotencyKey,
//     });

//     return {
//       success: true,
//       data: {
//         transactionId: ledger.id,
//         type: ledger.type,
//         amount: ledger.amount,
//         balanceBefore: ledger.balanceBefore,
//         balanceAfter: ledger.balanceAfter,
//         status: ledger.status,
//         createdAt: ledger.createdAt,
//       },
//     };
//   }

//   /**
//    * Debit a wallet with idempotency support
//    * POST /wallets/:id/debit
//    *
//    * Optional Header: X-Idempotency-Key
//    */
//   @ApiOperation({ summary: 'Debit a wallet with idempotency support' })
//   @ApiBody({ type: DebitWalletDto })
//   @ApiOkResponse({
//     description: 'The wallet has been successfully debited.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           transactionId: 'uuid',
//           type: 'debit',
//           amount: '100.00',
//           balanceBefore: '1000.00',
//           balanceAfter: '900.00',
//           status: 'completed',
//           createdAt: '2024-01-01T00:00:00.000Z',
//         },
//       },
//     },
//   })
//   @Post(':id/debit')
//   async debitWallet(
//     @Param('id') id: string,
//     @Body() debitWalletDto: DebitWalletDto,
//     @Headers('x-idempotency-key') idempotencyKey?: string,
//   ) {
//     const ledger = await this.walletService.debitWallet({
//       walletId: id,
//       ...debitWalletDto,
//       idempotencyKey,
//     });

//     return {
//       success: true,
//       data: {
//         transactionId: ledger.id,
//         type: ledger.type,
//         amount: ledger.amount,
//         balanceBefore: ledger.balanceBefore,
//         balanceAfter: ledger.balanceAfter,
//         status: ledger.status,
//         createdAt: ledger.createdAt,
//       },
//     };
//   }

//   /**
//    * Transfer between wallets with REQUIRED idempotency support
//    * POST /wallets/:id/transfer
//    *
//    * REQUIRED Header: X-Idempotency-Key
//    *
//    * This is the main endpoint for PART A: The Idempotent Wallet
//    *
//    * Features:
//    * - Prevents double-spending through row-level locking
//    * - Idempotency key prevents duplicate transactions from double-taps
//    * - TransactionLog created in PENDING state before main transaction
//    * - Atomic operation with automatic rollback on failure
//    */
//   @ApiOperation({
//     summary: 'Transfer between wallets with idempotency support',
//   })
//   @ApiBody({ type: TransferDto })
//   @ApiOkResponse({
//     description: 'The transfer has been successfully completed.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           transactionLogId: 'uuid',
//           idempotencyKey: 'uuid',
//           debit: {
//             transactionId: 'uuid',
//             walletId: 'uuid',
//             amount: '100.00',
//             balanceAfter: '900.00',
//           },
//           credit: {
//             transactionId: 'uuid',
//             walletId: 'uuid',
//             amount: '100.00',
//             balanceAfter: '1100.00',
//           },
//         },
//       },
//     },
//   })
//   @Post(':id/transfer')
//   async transfer(
//     @Param('id') id: string,
//     @Body() transferDto: TransferDto,
//     @Headers('x-idempotency-key') idempotencyKey: string,
//   ) {
//     const result = await this.walletService.transfer({
//       fromWalletId: id,
//       idempotencyKey,
//       ...transferDto,
//     });

//     return {
//       success: true,
//       data: {
//         transactionLogId: result.transactionLogId,
//         idempotencyKey: result.idempotencyKey,
//         debit: {
//           transactionId: result.debit.id,
//           walletId: result.debit.walletId,
//           amount: result.debit.amount,
//           balanceAfter: result.debit.balanceAfter,
//         },
//         credit: {
//           transactionId: result.credit.id,
//           walletId: result.credit.walletId,
//           amount: result.credit.amount,
//           balanceAfter: result.credit.balanceAfter,
//         },
//       },
//     };
//   }

//   /**
//    * Get transaction by idempotency key
//    * GET /wallets/transactions/by-key/:key
//    *
//    * Useful for clients to check if a transaction was processed
//    */
//   @ApiOperation({ summary: 'Get transaction by idempotency key' })
//   @ApiOkResponse({
//     description: 'The transaction was found.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           id: 'uuid',
//           idempotencyKey: 'uuid',
//           operation: 'transfer',
//           amount: '100.00',
//           status: 'completed',
//           createdAt: '2024-01-01T00:00:00.000Z',
//           ledgers: [],
//         },
//       },
//     },
//   })
//   @Get('transactions/by-key/:key')
//   async getTransactionByKey(@Param('key') key: string) {
//     const transaction =
//       await this.walletService.getTransactionByIdempotencyKey(key);
//     return {
//       success: true,
//       data: {
//         id: transaction.id,
//         idempotencyKey: transaction.idempotencyKey,
//         operation: transaction.operation,
//         amount: transaction.amount,
//         status: transaction.status,
//         createdAt: transaction.createdAt,
//         ledgers: transaction.ledgers,
//       },
//     };
//   }

//   /**
//    * Get transaction history
//    * GET /wallets/:id/transactions
//    */
//   @ApiOperation({ summary: 'Get transaction history' })
//   @ApiOkResponse({
//     description: 'The transaction history.',
//     schema: {
//       example: {
//         success: true,
//         data: {
//           transactions: [
//             {
//               id: 'uuid',
//               type: 'debit',
//               amount: '100.00',
//               balanceBefore: '1000.00',
//               balanceAfter: '900.00',
//               status: 'completed',
//               reference: 'Order #1234',
//               description: 'Payment for order #1234',
//               metadata: { orderId: '1234' },
//               createdAt: '2024-01-01T00:00:00.000Z',
//             },
//           ],
//           total: 1,
//           limit: 50,
//           offset: 0,
//         },
//       },
//     },
//   })
//   @Get(':id/transactions')
//   async getTransactionHistory(
//     @Param('id') id: string,
//     @Query('limit') limit?: string,
//     @Query('offset') offset?: string,
//   ) {
//     const result = await this.walletService.getTransactionHistory(
//       id,
//       limit ? parseInt(limit) : 50,
//       offset ? parseInt(offset) : 0,
//     );

//     return {
//       success: true,
//       data: {
//         transactions: result.transactions.map((t) => ({
//           id: t.id,
//           type: t.type,
//           amount: t.amount,
//           balanceBefore: t.balanceBefore,
//           balanceAfter: t.balanceAfter,
//           status: t.status,
//           reference: t.reference,
//           description: t.description,
//           metadata: t.metadata,
//           createdAt: t.createdAt,
//         })),
//         total: result.total,
//         limit: limit ? parseInt(limit) : 50,
//         offset: offset ? parseInt(offset) : 0,
//       },
//     };
//   }
// }

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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import {
  CreditWalletDto,
  CreateWalletDto,
  DebitWalletDto,
  TransferDto,
  WalletResponseDto,
  TransactionResponseDto,
  BalanceResponseDto,
  TransferResponseDto,
  TransactionLogResponseDto,
  TransactionHistoryResponseDto,
} from 'src/common/dto';

/**
 * WalletController
 * REST API endpoints for wallet operations with idempotency support
 * Rate limited to prevent abuse (100 requests/minute per IP)
 */
@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(RateLimitGuard)
@UseInterceptors(ResponseInterceptor)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Create a new wallet
   * POST /wallets
   */
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiBody({ type: CreateWalletDto })
  @ApiStandardResponse(
    WalletResponseDto,
    'The wallet has been successfully created.',
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const wallet = await this.walletService.createWallet(createWalletDto);
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
    };
  }

  /**
   * Get wallet by ID
   * GET /wallets/:id
   */
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiStandardResponse(WalletResponseDto, 'The wallet details.')
  @Get(':id')
  async getWallet(@Param('id') id: string) {
    const wallet = await this.walletService.getWalletById(id);
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Get wallet by user ID
   * GET /wallets/user/:userId
   */
  @ApiOperation({ summary: 'Get wallet by user ID' })
  @ApiStandardResponse(WalletResponseDto, 'The wallet details.')
  @Get('user/:userId')
  async getWalletByUserId(@Param('userId') userId: string) {
    const wallet = await this.walletService.getWalletByUserId(userId);
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Get wallet balance
   * GET /wallets/:id/balance
   */
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiStandardResponse(BalanceResponseDto, 'The wallet balance.')
  @Get(':id/balance')
  async getBalance(@Param('id') id: string) {
    const balance = await this.walletService.getBalance(id);
    return { balance };
  }

  /**
   * Credit a wallet with idempotency support
   * POST /wallets/:id/credit
   *
   * Optional Header: X-Idempotency-Key
   */
  @ApiOperation({ summary: 'Credit a wallet with idempotency support' })
  @ApiBody({ type: CreditWalletDto })
  @ApiStandardResponse(
    TransactionResponseDto,
    'The wallet has been successfully credited.',
  )
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
      transactionId: ledger.id,
      type: ledger.type,
      amount: ledger.amount,
      balanceBefore: ledger.balanceBefore,
      balanceAfter: ledger.balanceAfter,
      status: ledger.status,
      createdAt: ledger.createdAt,
    };
  }

  /**
   * Debit a wallet with idempotency support
   * POST /wallets/:id/debit
   *
   * Optional Header: X-Idempotency-Key
   */
  @ApiOperation({ summary: 'Debit a wallet with idempotency support' })
  @ApiBody({ type: DebitWalletDto })
  @ApiStandardResponse(
    TransactionResponseDto,
    'The wallet has been successfully debited.',
  )
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
      transactionId: ledger.id,
      type: ledger.type,
      amount: ledger.amount,
      balanceBefore: ledger.balanceBefore,
      balanceAfter: ledger.balanceAfter,
      status: ledger.status,
      createdAt: ledger.createdAt,
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
  @ApiOperation({
    summary: 'Transfer between wallets with idempotency support',
  })
  @ApiBody({ type: TransferDto })
  @ApiStandardResponse(
    TransferResponseDto,
    'The transfer has been successfully completed.',
  )
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
    };
  }

  /**
   * Get transaction by idempotency key
   * GET /wallets/transactions/by-key/:key
   *
   * Useful for clients to check if a transaction was processed
   */
  @ApiOperation({ summary: 'Get transaction by idempotency key' })
  @ApiStandardResponse(TransactionLogResponseDto, 'The transaction was found.')
  @Get('transactions/by-key/:key')
  async getTransactionByKey(@Param('key') key: string) {
    const transaction =
      await this.walletService.getTransactionByIdempotencyKey(key);
    return {
      id: transaction.id,
      idempotencyKey: transaction.idempotencyKey,
      operation: transaction.operation,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
      ledgers: transaction.ledgers,
    };
  }

  /**
   * Get transaction history
   * GET /wallets/:id/transactions
   */
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiStandardResponse(
    TransactionHistoryResponseDto,
    'The transaction history.',
  )
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
    };
  }
}
