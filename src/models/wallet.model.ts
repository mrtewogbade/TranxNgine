import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Ledger } from './ledger.model';

/**
 * Wallet Model
 * Represents a user's wallet with balance tracking
 * Uses DECIMAL type to ensure precise math without floating-point errors
 */
@Table({
  tableName: 'wallets',
  timestamps: true,
})
export class Wallet extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  userId: string;

  /**
   * Balance stored as DECIMAL(20,2) for precise calculations
   * This avoids floating-point precision issues
   * Supports up to 999,999,999,999,999,999.99
   */
  @Default('0.00')
  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false,
  })
  balance: string;

  @CreatedAt
  @Column
  declare createdAt: Date;

  @UpdatedAt
  @Column
  declare updatedAt: Date;
  @HasMany(() => Ledger)
  ledgers: Ledger[];
}
