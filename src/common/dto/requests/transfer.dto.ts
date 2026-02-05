import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'uuid' })
  @IsString()
  toWalletId: string;

  @ApiProperty({ example: '100.00' })
  @IsString()
  amount: string;

  @ApiPropertyOptional({ example: 'transfer-789' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Transfer to friend' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { purpose: 'gift' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
