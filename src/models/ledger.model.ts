import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Wallet } from './wallet.model';

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Ledger Model
 * Records all wallet transactions with precise amount tracking
 * Maintains balance snapshots for audit trail
 */
@Table({
  tableName: 'ledgers',
  timestamps: true,
})
export class Ledger extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  walletId: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
    allowNull: false,
  })
  type: TransactionType;

  /**
   * Amount stored as DECIMAL(20,2) for precise calculations
   */
  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false,
  })
  amount: string;

  /**
   * Balance before transaction
   */
  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false,
  })
  balanceBefore: string;

  /**
   * Balance after transaction
   */
  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false,
  })
  balanceAfter: string;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionStatus)),
    allowNull: false,
    defaultValue: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  reference: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any>;

  /**
   * Link to TransactionLog for idempotency tracking
   */
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  transactionLogId: string;

  @CreatedAt
  @Column
  declare createdAt: Date;

  @UpdatedAt
  @Column
  declare updatedAt: Date;

  @BelongsTo(() => Wallet)
  wallet: Wallet;
}
