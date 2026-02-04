class TransferDto {
  toWalletId: string;
  amount: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export { TransferDto };
