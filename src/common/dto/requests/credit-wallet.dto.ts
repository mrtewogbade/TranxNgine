import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreditWalletDto {
  @ApiProperty({ example: '100.00' })
  @IsString()
  amount: string;

  @ApiPropertyOptional({ example: 'deposit-123' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Monthly salary deposit' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { source: 'payroll' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
