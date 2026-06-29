import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  // `rawBody: true` buffers the unparsed request body (req.rawBody) so the Stripe webhook can
  // verify signatures against the exact bytes Stripe signed. JSON parsing still happens for
  // every other route as normal.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.use(cookieParser());

  // The frontend talks to us same-origin via a Next.js proxy, but we still lock CORS down to
  // the known frontend origin and allow credentials so cookie auth works for direct calls too.
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Global ValidationPipe, exception filter, and auth/roles guards are registered in AppModule
  // (APP_PIPE / APP_FILTER / APP_GUARD) so they also apply in e2e tests.

  // OpenAPI / Swagger — exposed in non-production environments only.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Mini E-Commerce API')
      .setDescription(
        'API for the Mini E-Commerce platform (storefront + admin). ' +
          'Authentication uses a JWT stored in an httpOnly cookie named `access_token`, ' +
          'set by /auth/login and /auth/signup.',
      )
      .setVersion('0.2.0')
      .addCookieAuth('access_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'JWT issued by /auth/login or /auth/signup (httpOnly cookie).',
      })
      .addTag('auth', 'Authentication & session')
      .addTag('users', 'User management (admin)')
      .addTag('health', 'Service health')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { withCredentials: true },
    });
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`Swagger UI on http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
