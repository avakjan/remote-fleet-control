import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { OperatorsModule } from '../operators/operators.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [OperatorsModule, VehiclesModule],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}
