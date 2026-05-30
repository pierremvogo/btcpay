import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateBtcpayDto {
  @ApiProperty({
    example: 'user_123',
    description: "Identifiant de l'utilisateur qui effectue le paiement",
  })
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({
    example: 10,
    description: "Montant de l'invoice",
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 'USD',
    description: 'Devise de la facture',
    default: 'USD',
    required: false,
  })
  @IsString()
  currency?: string;
}
