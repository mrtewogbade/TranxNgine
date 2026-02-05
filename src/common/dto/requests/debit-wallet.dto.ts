import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class DebitWalletDto {
  @ApiProperty({ example: '100.00' })
  @IsString()
  amount: string;

  @ApiPropertyOptional({ example: 'order-456' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Payment for order #456' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { orderId: '456' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
