import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BtcpayService } from './btcpay.service';
import { CreateBtcpayDto } from './dto/create-btcpay.dto';
import { MobileMoneyCheckoutDto } from './dto/mobile-money.dto';
import { OrangeMoneyWebhookDto } from './dto/mobile-money-webhook.dto';

@ApiTags('BTCPay')
@Controller('btcpay')
export class BtcpayController {
  constructor(private readonly btcpayService: BtcpayService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Créer une invoice BTCPay classique' })
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

  @Post('mobile-money/checkout')
  @ApiOperation({
    summary: 'Créer un paiement Orange Money lié à une invoice BTCPay',
  })
  @ApiBody({
    type: MobileMoneyCheckoutDto,
    examples: {
      example1: {
        value: {
          userId: 'user_123',
          phone: '237690000000',
          amountXaf: 6500,
          amountUsd: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Paiement Orange Money initialisé',
    schema: {
      example: {
        internalPaymentId: 'om_user_123_1712345678',
        btcpayInvoiceId: 'abc123',
        orangeMoneyPaymentUrl: 'https://orange-money-payment-url.com/pay/xyz',
        status: 'PENDING_MOBILE_PAYMENT',
      },
    },
  })
  async mobileMoneyCheckout(@Body() body: MobileMoneyCheckoutDto) {
    return this.btcpayService.startMobileMoneyCheckout({
      userId: body.userId,
      phone: body.phone,
      amountXaf: body.amountXaf,
      amountUsd: body.amountUsd,
    });
  }

  @Post('mobile-money/webhook')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Webhook Mobile Money : confirmer le paiement mobile money puis payer automatiquement BTCPay',
  })
  @ApiBody({
    type: OrangeMoneyWebhookDto,
    examples: {
      success: {
        value: {
          status: 'SUCCESS',
          invoiceId: 'abc123',
          internalPaymentId: 'om_user_123_1712345678',
          transactionId: 'om_tx_987654321',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook Orange Money traité',
    schema: {
      example: {
        received: true,
        cryptoPayment: {
          invoiceId: 'abc123',
          cryptoAddress: 'tb1qxxxxxxxxxxxxxxxx',
          amountBtc: '0.00012345',
          txid: 'bitcoin_testnet_txid',
          status: 'CRYPTO_SENT_TO_BTCPAY_INVOICE',
        },
      },
    },
  })
  async orangeMoneyWebhook(@Body() body: OrangeMoneyWebhookDto) {
    const isPaid = this.btcpayService.verifyOrangeMoneyWebhook(body);

    if (!isPaid) {
      return {
        received: true,
        status: 'ORANGE_PAYMENT_NOT_CONFIRMED',
      };
    }

    const cryptoPayment = await this.btcpayService.handleOrangeMoneySuccess(
      body.invoiceId,
    );

    return {
      received: true,
      cryptoPayment,
    };
  }

  @Get('invoices/:invoiceId/payment-address')
  @ApiOperation({
    summary: "Récupérer l'adresse BTC de paiement d'une invoice BTCPay",
  })
  @ApiParam({
    name: 'invoiceId',
    example: 'abc123',
    description: "Identifiant de l'invoice BTCPay",
  })
  @ApiResponse({
    status: 200,
    description: 'Adresse BTC récupérée avec succès',
    schema: {
      example: {
        paymentMethod: 'BTC-CHAIN',
        destination: 'tb1qxxxxxxxxxxxxxxxxxxxx',
        amount: '0.00012345',
        rate: '65000.00',
      },
    },
  })
  async getBitcoinPaymentAddress(@Param('invoiceId') invoiceId: string) {
    return this.btcpayService.getBitcoinPaymentAddress(invoiceId);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recevoir les webhooks BTCPay' })
  @ApiHeader({
    name: 'btcpay-sig',
    description: 'Signature HMAC envoyée par BTCPay Server',
    required: true,
  })
  @ApiBody({
    schema: {
      example: {
        deliveryId: 'delivery_123',
        webhookId: 'webhook_123',
        originalDeliveryId: null,
        isRedelivery: false,
        type: 'InvoiceSettled',
        timestamp: 1712345678,
        storeId: 'store_123',
        invoiceId: 'abc123',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook BTCPay reçu avec succès',
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
      console.log('Invoice BTCPay payée:', invoiceId);

      // Ici : activer abonnement / commande
    }

    return { received: true };
  }
}
