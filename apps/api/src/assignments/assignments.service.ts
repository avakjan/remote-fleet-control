import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { toObjectId } from '../common/mongo';
import { OperatorsService } from '../operators/operators.service';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { presentVehicle, VehicleResponse } from '../vehicles/vehicle.presenter';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<Vehicle>,
    private readonly operatorsService: OperatorsService,
  ) {}

  async takeover(
    vehicleId: string,
    operatorId: string,
  ): Promise<VehicleResponse> {
    const operator = await this.operatorsService.findDocument(operatorId);
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    const id = toObjectId(vehicleId, 'vehicleId');

    try {
      const vehicle = await this.vehicleModel
        .findOneAndUpdate(
          {
            _id: id,
            isOnline: true,
            assignedOperatorId: { $exists: false },
          },
          { $set: { assignedOperatorId: operator._id } },
          { returnDocument: 'after' },
        )
        .exec();

      if (vehicle) {
        return presentVehicle(vehicle);
      }
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Operator is already assigned to another vehicle',
        );
      }
      throw error;
    }

    const current = await this.vehicleModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException('Vehicle not found');
    }
    if (!current.isOnline) {
      throw new ConflictException('Offline vehicles cannot be taken over');
    }

    throw new ConflictException('Vehicle is already assigned');
  }

  async release(
    vehicleId: string,
    operatorId: string,
  ): Promise<VehicleResponse> {
    const operator = await this.operatorsService.findDocument(operatorId);
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    const id = toObjectId(vehicleId, 'vehicleId');
    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        { _id: id, assignedOperatorId: operator._id },
        { $unset: { assignedOperatorId: '' } },
        { returnDocument: 'after' },
      )
      .exec();

    if (vehicle) {
      return presentVehicle(vehicle);
    }

    const current = await this.vehicleModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException('Vehicle not found');
    }
    if (!current.assignedOperatorId) {
      throw new ConflictException('Vehicle is not assigned');
    }

    throw new ConflictException('Vehicle is assigned to a different operator');
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
