import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Wallet } from './wallet.model';
import { Ledger, TransactionStatus } from './ledger.model';

/**
 * TransactionLog Model
 * Tracks all wallet operations with idempotency keys
 * 
 * Purpose:
 * 1. Idempotency: Prevent duplicate transactions from double-taps
 * 2. Audit Trail: Record all transaction attempts (success, pending, failed)
 * 3. Recovery: If connection drops during transaction, we have a record
 * 
 * Lifecycle:
 * 1. Created in PENDING state BEFORE main transaction
 * 2. Updated to COMPLETED after successful transaction
 * 3. Updated to FAILED if transaction fails
 */
@Table({
  tableName: 'transaction_logs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['idempotencyKey'],
    },
    {
      fields: ['walletId', 'status'],
    },
    {
      fields: ['createdAt'],
    },
  ],
})
export class TransactionLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  /**
   * Idempotency Key (UNIQUE)
   * Client-provided key to prevent duplicate transactions
   * Same key = same transaction (returns existing result)
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  idempotencyKey: string;

  /**
   * Operation type
   */
  @Column({
    type: DataType.ENUM('CREDIT', 'DEBIT', 'TRANSFER'),
    allowNull: false,
  })
  operation: string;

  /**
   * Primary wallet involved (source wallet for transfers)
   */
  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  walletId: string;

  /**
   * Transaction amount
   */
  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false,
  })
  amount: string;

  /**
   * Transaction status
   * PENDING: Transaction in progress
   * COMPLETED: Transaction successful
   * FAILED: Transaction failed
   */
  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
    defaultValue: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  /**
   * Additional metadata
   * Can include: reference, description, error messages, etc.
   */
  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any>;

  @CreatedAt
  @Column
  declare createdAt: Date;

  @UpdatedAt
  @Column
  declare updatedAt: Date;

  @BelongsTo(() => Wallet)
  wallet: Wallet;

  @HasMany(() => Ledger, 'transactionLogId')
  ledgers: Ledger[];
}
