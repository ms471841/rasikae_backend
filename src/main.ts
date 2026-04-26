import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {

  //enable cors for all domains
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
      // origin: [
      //   'http://localhost:5173', // Admin Panel
      //   'http://localhost:3000', // Backend itself
      //   'https://rasikae.com',
      //   'https://rasikaebackend-production.up.railway.app/',
      //   /\.rasikae\.com$/,       // Any subdomain of rasikae.com

      // ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Accept,Authorization',
      credentials: true,
    },
  });

  // Security Headers
  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
