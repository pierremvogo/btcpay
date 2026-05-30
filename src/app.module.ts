import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
} from 'nestjs-i18n';
import { BtcpayService } from './modules/btcpay/btcpay.service';
import { BtcpayController } from './modules/btcpay/btcpay.controller';
import { BtcpayModule } from './modules/btcpay/btcpay.module';

import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '..', 'i18n'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        { use: HeaderResolver, options: ['x-lang'] },
        AcceptLanguageResolver,
      ],
    }),
    PrismaModule,
    BtcpayModule,
  ],
  controllers: [AppController, BtcpayController],
  providers: [AppService, BtcpayService],
})
export class AppModule {}
