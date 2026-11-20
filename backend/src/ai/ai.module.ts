import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AiService } from './ai.service.js'
import { AiController } from './ai.controller.js'
import { Progress, ProgressSchema } from '../schemas/progress.schema.js'
import { AuthModule } from '../auth/auth.module.js'
import { AppModule } from '../app.module.js'

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AppModule),
    MongooseModule.forFeature([{ name: Progress.name, schema: ProgressSchema }]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
