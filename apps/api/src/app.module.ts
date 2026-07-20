import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AssignmentsModule } from './assignments/assignments.module';
import { SeedService } from './database/seed.service';
import { OperatorsModule } from './operators/operators.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://localhost:27017/fleet',
      }),
    }),
    VehiclesModule,
    OperatorsModule,
    AssignmentsModule,
  ],
  controllers: [AppController],
  providers: [SeedService],
})
export class AppModule {}
