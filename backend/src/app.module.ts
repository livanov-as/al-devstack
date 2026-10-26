import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Certificate, CertificateSchema } from './schemas/certificate.schema.js';
import { Progress, ProgressSchema } from './schemas/progress.schema.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import path from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded accurately for database orchestration
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve('../.env') });
}

@Module({
  imports: [
    // Automated MongoDB infrastructure connectivity management layer
    MongooseModule.forRoot(process.env.MONGO_URI || ''),
    
    // Bind data schemas explicitly to the active DI container scope
    MongooseModule.forFeature([
      { name: Certificate.name, schema: CertificateSchema },
      { name: Progress.name, schema: ProgressSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // We will inject tracking middleware or connection guards here on the next steps
  }
}
