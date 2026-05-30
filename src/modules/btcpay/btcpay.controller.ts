import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BtcpayService } from './btcpay.service';
import { CreateBtcpayDto } from './dto/create-btcpay.dto';

@ApiTags('BTCPay')
@Controller('btcpay')
export class BtcpayController {
  constructor(private readonly btcpayService: BtcpayService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Créer une invoice BTCPay' })
  @ApiBody({ type: CreateBtcpayDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice créée avec succès',
    schema: {
      example: {
        invoiceId: 'abc123',
        checkoutUrl: 'https://testnet.demo.btcpayserver.org/i/abc123',
        status: 'New',
      },
    },
  })
  async checkout(@Body() body: CreateBtcpayDto) {
    return this.btcpayService.createInvoice(
      body.userId,
      body.amount,
      body.currency ?? 'USD',
    );
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recevoir les webhooks BTCPay' })
  @ApiHeader({
    name: 'btcpay-sig',
    description: 'Signature HMAC envoyée par BTCPay Server',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook reçu avec succès',
    schema: {
      example: {
        received: true,
      },
    },
  })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('btcpay-sig') signature: string,
    @Body() body: any,
  ) {
    this.btcpayService.verifyWebhook(req.rawBody!, signature);

    if (body.type === 'InvoiceSettled') {
      const invoiceId = body.invoiceId;
      console.log('Invoice payée:', invoiceId);
    }

    return { received: true };
  }
}
