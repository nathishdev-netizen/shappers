import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Comma-separated list of allowed origins, e.g. "https://shaper.vercel.app".
  // Unset means allow any origin, which keeps local development and the demo
  // working; set it in production once the web app's domain is known.
  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : true, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  // Bind to every interface: platforms like Railway and Render route traffic to
  // the container's external address, and the Node default of localhost would
  // make the service look dead to their health checks.
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

await bootstrap();
