import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OrangeMoneyWebhookDto {
  @ApiProperty({
    example: 'SUCCESS',
  })
  @IsString()
  status!: string;

  @ApiProperty({
    example: 'abc123',
  })
  @IsString()
  invoiceId!: string;

  @ApiProperty({
    example: 'om_user_123_1712345678',
  })
  @IsString()
  internalPaymentId!: string;

  @ApiProperty({
    example: 'om_tx_987654321',
  })
  @IsString()
  transactionId!: string;
}
