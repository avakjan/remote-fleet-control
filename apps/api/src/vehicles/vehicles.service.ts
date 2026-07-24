import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { isDuplicateKeyError } from '../common/is-duplicate-key-error';
import { toObjectId } from '../common/mongo';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { presentVehicle, VehicleResponse } from './vehicle.presenter';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<Vehicle>,
  ) {}

  async create(dto: CreateVehicleDto): Promise<VehicleResponse> {
    try {
      const vehicle = await this.vehicleModel.create({
        ...dto,
        isOnline: dto.isOnline ?? false,
      });
      return presentVehicle(vehicle);
    } catch (error: unknown) {
      this.throwIfDuplicateCode(error);
      throw error;
    }
  }

  async findAll(): Promise<VehicleResponse[]> {
    const vehicles = await this.vehicleModel.find().sort({ code: 1 }).exec();
    return vehicles.map(presentVehicle);
  }

  async findOne(id: string): Promise<VehicleResponse> {
    return presentVehicle(await this.findDocument(id));
  }

  async findDocument(id: string): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel.findById(toObjectId(id)).exec();
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleResponse> {
    const vehicleId = toObjectId(id);

    try {
      if (dto.isOnline === false) {
        return presentVehicle(
          await this.updateOnlyWhenUnassigned(vehicleId, dto),
        );
      }

      const vehicle = await this.vehicleModel
        .findByIdAndUpdate(
          vehicleId,
          { $set: dto },
          { returnDocument: 'after' },
        )
        .exec();

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      return presentVehicle(vehicle);
    } catch (error: unknown) {
      this.throwIfDuplicateCode(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const vehicleId = toObjectId(id);
    const deleted = await this.vehicleModel
      .findOneAndDelete({
        _id: vehicleId,
        assignedOperatorId: { $exists: false },
      })
      .exec();

    if (deleted) {
      return;
    }

    const current = await this.vehicleModel.findById(vehicleId).exec();
    if (!current) {
      throw new NotFoundException('Vehicle not found');
    }

    throw new ConflictException(
      'Assigned vehicle must be released before it can be deleted',
    );
  }

  async assignOperator(
    vehicleId: string,
    operatorId: Types.ObjectId,
  ): Promise<VehicleResponse> {
    const id = toObjectId(vehicleId, 'vehicleId');

    try {
      const vehicle = await this.vehicleModel
        .findOneAndUpdate(
          {
            _id: id,
            isOnline: true,
            assignedOperatorId: { $exists: false },
          },
          { $set: { assignedOperatorId: operatorId } },
          { returnDocument: 'after' },
        )
        .exec();

      if (vehicle) {
        return presentVehicle(vehicle);
      }
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
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

  async releaseOperator(
    vehicleId: string,
    operatorId: Types.ObjectId,
  ): Promise<VehicleResponse> {
    const id = toObjectId(vehicleId, 'vehicleId');
    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        { _id: id, assignedOperatorId: operatorId },
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

  private async updateOnlyWhenUnassigned(
    id: Types.ObjectId,
    dto: UpdateVehicleDto,
  ): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel
      .findOneAndUpdate(
        { _id: id, assignedOperatorId: { $exists: false } },
        { $set: dto },
        { returnDocument: 'after' },
      )
      .exec();

    if (vehicle) {
      return vehicle;
    }

    const current = await this.vehicleModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException('Vehicle not found');
    }

    throw new ConflictException(
      'Assigned vehicle must be released before it can go offline',
    );
  }

  private throwIfDuplicateCode(error: unknown): void {
    if (isDuplicateKeyError(error)) {
      throw new ConflictException('A vehicle with this code already exists');
    }
  }
}
