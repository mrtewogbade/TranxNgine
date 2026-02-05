import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ example: '1000.00' })
  balance: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z', required: false })
  updatedAt?: Date;
}

export class BalanceResponseDto {
  @ApiProperty({ example: '1000.00' })
  balance: string;
}

export class TransactionResponseDto {
  @ApiProperty({ example: 'uuid' })
  transactionId: string;

  @ApiProperty({ example: 'credit' })
  type: string;

  @ApiProperty({ example: '100.00' })
  amount: string;

  @ApiProperty({ example: '900.00' })
  balanceBefore: string;

  @ApiProperty({ example: '1000.00' })
  balanceAfter: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class TransferResponseDto {
  @ApiProperty({ example: 'uuid' })
  transactionLogId: string;

  @ApiProperty({ example: 'uuid' })
  idempotencyKey: string;

  @ApiProperty({
    type: 'object',
    properties: {
      transactionId: { type: 'string', example: 'uuid' },
      walletId: { type: 'string', example: 'uuid' },
      amount: { type: 'string', example: '100.00' },
      balanceAfter: { type: 'string', example: '900.00' },
    },
  })
  debit: {
    transactionId: string;
    walletId: string;
    amount: string;
    balanceAfter: string;
  };

  @ApiProperty({
    type: 'object',
    properties: {
      transactionId: { type: 'string', example: 'uuid' },
      walletId: { type: 'string', example: 'uuid' },
      amount: { type: 'string', example: '100.00' },
      balanceAfter: { type: 'string', example: '1100.00' },
    },
  })
  credit: {
    transactionId: string;
    walletId: string;
    amount: string;
    balanceAfter: string;
  };
}

export class TransactionLogResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  idempotencyKey: string;

  @ApiProperty({ example: 'transfer' })
  operation: string;

  @ApiProperty({ example: '100.00' })
  amount: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  ledgers: any[];
}

export class TransactionHistoryItemDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'debit' })
  type: string;

  @ApiProperty({ example: '100.00' })
  amount: string;

  @ApiProperty({ example: '1000.00' })
  balanceBefore: string;

  @ApiProperty({ example: '900.00' })
  balanceAfter: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: 'Order #1234', required: false })
  reference?: string;

  @ApiProperty({ example: 'Payment for order #1234', required: false })
  description?: string;

  @ApiProperty({ example: { orderId: '1234' }, required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ type: [TransactionHistoryItemDto] })
  transactions: TransactionHistoryItemDto[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}
