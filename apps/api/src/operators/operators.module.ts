import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OperatorsService } from './operators.service';
import { OperatorsController } from './operators.controller';
import { Operator, OperatorSchema } from './schemas/operator.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Operator.name, schema: OperatorSchema },
    ]),
  ],
  providers: [OperatorsService],
  controllers: [OperatorsController],
  exports: [MongooseModule, OperatorsService],
})
export class OperatorsModule {}
