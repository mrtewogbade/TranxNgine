import { Ledger } from '../../models/ledger.model';

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
