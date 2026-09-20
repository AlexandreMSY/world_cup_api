import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { parseTrustProxy } from './config/rate-limit.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);

  if (trustProxy !== false) {
    app.set('trust proxy', trustProxy);
  }
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('World Cup API')
    .setDescription(
      'Work-in-progress API for World Cup and football-related data.',
    )
    .setVersion('1.0')
    .addTag('Health')
    .addTag('Authentication')
    .addTag('API Keys')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by POST /auth/login.',
      },
      'jwt',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Reserved for future football-related endpoints.',
      },
      'apiKey',
    )
    .build();
  const swaggerDocument = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
