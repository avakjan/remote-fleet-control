import { Injectable, NotFoundException } from '@nestjs/common';
import { OperatorsService } from '../operators/operators.service';
import { VehicleResponse } from '../vehicles/vehicle.presenter';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async takeover(
    vehicleId: string,
    operatorId: string,
  ): Promise<VehicleResponse> {
    const operator = await this.findOperator(operatorId);
    return this.vehiclesService.assignOperator(vehicleId, operator._id);
  }

  async release(
    vehicleId: string,
    operatorId: string,
  ): Promise<VehicleResponse> {
    const operator = await this.findOperator(operatorId);
    return this.vehiclesService.releaseOperator(vehicleId, operator._id);
  }

  private async findOperator(operatorId: string) {
    const operator = await this.operatorsService.findDocument(operatorId);
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
    return operator;
  }
}
