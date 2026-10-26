import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import dotenv from 'dotenv';
import path from 'path';

// Load local configuration file only if environment variables are not set by the hosting provider
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve('../.env') });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 5000;

  // Strict whitelist configuration mapping for safe cross-origin requests
  const allowedOrigins = [
    'http://localhost:5173',
    'https://al-devstack.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS security policies'));
      }
    },
  });

  // Set global routing prefix to match legacy infrastructure contracts
  app.setGlobalPrefix('api');

  // Build declarative interactive Swagger interface specification
  const config = new DocumentBuilder()
    .setTitle('al-devstack API Infrastructure')
    .setDescription('Interactive OpenAPI documentation for freeCodeCamp v9 GIS telemetry matrix services.')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter the CACHE_SECRET_TOKEN value to authenticate webhook flushes',
      },
      'BearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(PORT);
  console.log(`🚀 NestJS Backend server successfully running on port ${PORT}`);
  console.log(`📑 Interactive API Documentation running on target: http://localhost:${PORT}/api-docs`);
}

bootstrap();
