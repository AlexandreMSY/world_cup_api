import 'dotenv/config';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { AuthModule } from './auth/auth.module.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InitialSchema1760000000000 } from './database/migrations/1760000000000-initial-schema.js';
import { RATE_LIMIT } from './config/rate-limit.config.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([RATE_LIMIT]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false,
      migrations: [InitialSchema1760000000000],
      migrationsRun: false,
    }),
    AuthModule,
    ApiKeysModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
