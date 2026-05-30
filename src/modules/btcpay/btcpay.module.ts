import { Module } from '@nestjs/common';
import { BtcpayService } from './btcpay.service';
import { BtcpayController } from './btcpay.controller';

@Module({
  controllers: [BtcpayController],
  providers: [BtcpayService],
})
export class BtcpayModule {}
