import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(config.apiPrefix);

  // Behind nginx on the VPS: without this, req.ip is the proxy's address and
  // every rate limit would be shared across all clients.
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  /**
   * `credentials: true` is what allows the browser to send our httpOnly
   * cookies cross-origin. It is illegal alongside a wildcard origin, so the
   * allowlist from config is required, not optional.
   */
  app.enableCors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token'],
  });

  app.enableShutdownHooks();

  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tribeca Jets Command Center API')
      .setDescription(
        'Authentication uses httpOnly cookies. Send state-changing requests with credentials included and an X-CSRF-Token header.',
      )
      .setVersion('1.0')
      .addCookieAuth('tj_access')
      .build();

    SwaggerModule.setup(
      `${config.apiPrefix}/docs`,
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      { swaggerOptions: { withCredentials: true } },
    );
  }

  await app.listen(config.port, '0.0.0.0');

  logger.log(`API      → http://localhost:${config.port}/${config.apiPrefix}`);
  if (!config.isProduction) {
    logger.log(`Docs     → http://localhost:${config.port}/${config.apiPrefix}/docs`);
  }
  logger.log(`Env      → ${config.nodeEnv}`);
  logger.log(`Storage  → ${config.storage.driver}`);
}

await bootstrap();
