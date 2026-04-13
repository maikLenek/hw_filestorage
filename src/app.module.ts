import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { configValidationSchema } from './config/configuration';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        stopAtFirstError: true,
      },
    }),

    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
