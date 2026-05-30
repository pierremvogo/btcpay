// btcpay.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class BtcpayService {
  private readonly baseUrl = process.env.BTCPAY_URL!;
  private readonly storeId = process.env.BTCPAY_STORE_ID!;
  private readonly apiKey = process.env.BTCPAY_API_KEY!;

  async createInvoice(userId: string, amount: number, currency = 'USD') {
    const url = `${this.baseUrl}/api/v1/stores/${this.storeId}/invoices`;

    const { data } = await axios.post(
      url,
      {
        amount: amount.toString(),
        currency,
        metadata: {
          userId,
          orderId: `sub_${userId}_${Date.now()}`,
        },
        checkout: {
          redirectURL: `${process.env.FRONTEND_URL}/payment/success`,
          redirectAutomatically: false,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${this.apiKey}`,
        },
      },
    );

    return {
      invoiceId: data.id,
      checkoutUrl: data.checkoutLink,
      status: data.status,
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string) {
    const secret = process.env.BTCPAY_WEBHOOK_SECRET!;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const received = signature?.replace('sha256=', '');

    if (expected !== received) {
      throw new BadRequestException('Invalid BTCPay webhook signature');
    }
  }
}
