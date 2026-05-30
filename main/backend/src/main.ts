import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  await app.listen(3001);
  // eslint-disable-next-line no-console
  console.log('Server running on http://localhost:3001');
}

bootstrap();
