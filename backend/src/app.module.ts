import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Certificate, CertificateSchema } from './schemas/certificate.schema.js';
import { Progress, ProgressSchema } from './schemas/progress.schema.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { AuthModule } from './auth/auth.module.js';
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
      { name: User.name, schema: UserSchema },
    ]),

    // Integrate the dedicated identity authentication sub-system module
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // We will inject tracking middleware or connection guards here on the next steps
  }
}
