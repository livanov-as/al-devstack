import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'
import { User, UserSchema } from '../schemas/user.schema.js'
import { Progress, ProgressSchema } from '../schemas/progress.schema.js'
import { Certificate, CertificateSchema } from '../schemas/certificate.schema.js'

@Module({
  imports: [
    // Bind all necessary data model models required for multi-user telemetry and FIFO purging pipelines
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Progress.name, schema: ProgressSchema },
      { name: Certificate.name, schema: CertificateSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // Export AuthService to make it accessible for global data isolation guards later
})
export class AuthModule {}
