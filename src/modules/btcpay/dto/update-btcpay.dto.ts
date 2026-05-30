import { PartialType } from '@nestjs/swagger';
import { CreateBtcpayDto } from './create-btcpay.dto';

export class UpdateBtcpayDto extends PartialType(CreateBtcpayDto) {}
