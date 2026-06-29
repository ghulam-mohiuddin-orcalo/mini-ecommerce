import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
