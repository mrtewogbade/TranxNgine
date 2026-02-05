export * from './requests/credit-wallet.dto';
export * from './requests/create-wallet.dto';
export * from './requests/debit-wallet.dto';
export * from './requests/transfer.dto';

export * from './responses/wallet-response.dto';
export * from './responses/api-response.dto';

export * from './pagination.dto';
// Note: avoid re-exporting local DTO interfaces that conflict with
// request DTO class names (e.g. TransferDto, CreateWalletDto).
// If you need those interfaces, import them explicitly from './wallet.dto'.
