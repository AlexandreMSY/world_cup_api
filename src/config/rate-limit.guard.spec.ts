import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

@Injectable()
class UnauthorizedGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new UnauthorizedException();
  }
}

@Controller('rate-limit-test')
@UseGuards(UnauthorizedGuard)
class RateLimitTestController {
  @Get()
  get(): void {}
}

describe('global rate limiting', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ limit: 2, ttl: 60_000 }])],
      controllers: [RateLimitTestController],
      providers: [
        UnauthorizedGuard,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('counts unauthorized requests and returns 429 at the limit', async () => {
    await request(app.getHttpServer()).get('/rate-limit-test').expect(401);
    await request(app.getHttpServer()).get('/rate-limit-test').expect(401);
    await request(app.getHttpServer()).get('/rate-limit-test').expect(429);
  });
});
