import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class BtcpayService {
  private readonly baseUrl = process.env.BTCPAY_URL!;
  private readonly storeId = process.env.BTCPAY_STORE_ID!;
  private readonly apiKey = process.env.BTCPAY_API_KEY!;

  private readonly orangeMoneyUrl = process.env.ORANGE_MONEY_URL!;
  private readonly orangeMoneyApiKey = process.env.ORANGE_MONEY_API_KEY!;

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

  async getInvoicePaymentMethods(invoiceId: string) {
    const url = `${this.baseUrl}/api/v1/stores/${this.storeId}/invoices/${invoiceId}/payment-methods`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `token ${this.apiKey}`,
      },
    });

    return data;
  }

  async getBitcoinPaymentAddress(invoiceId: string) {
    const paymentMethods = await this.getInvoicePaymentMethods(invoiceId);

    const btcMethod = paymentMethods.find((method: any) =>
      method.paymentMethod?.includes('BTC'),
    );

    if (!btcMethod) {
      throw new BadRequestException('Aucune méthode BTC trouvée');
    }

    return {
      paymentMethod: btcMethod.paymentMethod,
      destination: btcMethod.destination,
      amount: btcMethod.amount,
      rate: btcMethod.rate,
    };
  }

  async initiateOrangeMoneyPayment(params: {
    userId: string;
    amountXaf: number;
    phone: string;
    internalPaymentId: string;
  }) {
    const { data } = await axios.post(
      `${this.orangeMoneyUrl}/payments`,
      {
        amount: params.amountXaf,
        currency: 'XAF',
        phone: params.phone,
        reference: params.internalPaymentId,
        returnUrl: `${process.env.FRONTEND_URL}/payment/pending`,
        notifyUrl: `${process.env.BACKEND_URL}/btcpay/orange-money/webhook`,
      },
      {
        headers: {
          Authorization: `Bearer ${this.orangeMoneyApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      paymentUrl: data.payment_url,
      transactionId: data.transaction_id,
      raw: data,
    };
  }

  async startMobileMoneyCheckout(params: {
    userId: string;
    phone: string;
    amountXaf: number;
    amountUsd: number;
  }) {
    const invoice = await this.createInvoice(
      params.userId,
      params.amountUsd,
      'USD',
    );

    const internalPaymentId = `om_${params.userId}_${Date.now()}`;

    const orangePayment = await this.initiateOrangeMoneyPayment({
      userId: params.userId,
      amountXaf: params.amountXaf,
      phone: params.phone,
      internalPaymentId,
    });

    return {
      internalPaymentId,
      btcpayInvoiceId: invoice.invoiceId,
      orangeMoneyPaymentUrl: orangePayment.paymentUrl,
      status: 'PENDING_ORANGE_PAYMENT',
    };
  }

  async handleOrangeMoneySuccess(invoiceId: string) {
    const paymentInfo = await this.getBitcoinPaymentAddress(invoiceId);

    const tx = await this.sendBitcoinFromMainWallet({
      address: paymentInfo.destination,
      amountBtc: paymentInfo.amount,
    });

    return {
      invoiceId,
      cryptoAddress: paymentInfo.destination,
      amountBtc: paymentInfo.amount,
      txid: tx.txid,
      status: 'CRYPTO_SENT_TO_BTCPAY_INVOICE',
    };
  }

  async sendBitcoinFromMainWallet(params: {
    address: string;
    amountBtc: string;
  }) {
    const { stdout } = await execFileAsync('bitcoin-cli', [
      '-testnet',
      'sendtoaddress',
      params.address,
      params.amountBtc,
    ]);

    return {
      txid: stdout.trim(),
    };
  }

  verifyOrangeMoneyWebhook(body: any) {
    return body.status === 'SUCCESS' || body.status === 'PAID';
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
