import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class MobileMoneyCheckoutDto {
  @ApiProperty({
    example: 'user_123',
    description: "Identifiant de l'utilisateur",
  })
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({
    example: '237690000000',
    description: 'Numéro Orange Money ou MTN MoMo',
  })
  @IsString()
  @Matches(/^[0-9]{9,15}$/)
  phone!: string;

  @ApiProperty({
    example: 6500,
    description: 'Montant à prélever en FCFA',
  })
  @IsNumber()
  @IsPositive()
  amountXaf!: number;

  @ApiProperty({
    example: 10,
    description: 'Montant correspondant côté BTCPay',
  })
  @IsNumber()
  @IsPositive()
  amountUsd!: number;
}
