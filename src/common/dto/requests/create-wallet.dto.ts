import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'user-123' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: '1000.00' })
  @IsOptional()
  @IsString()
  initialBalance?: string;
}
