import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Operator } from '../operators/schemas/operator.schema';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';

const OPERATORS = [
  { employeeId: 'OP-001', name: 'Nora Berg' },
  { employeeId: 'OP-002', name: 'Daniel Okoye' },
  { employeeId: 'OP-003', name: 'Leila Haddad' },
] as const;

const VEHICLES = [
  { code: 'FLEET-101', name: 'Atlas 101', isOnline: true },
  { code: 'FLEET-204', name: 'Atlas 204', isOnline: true },
  { code: 'FLEET-315', name: 'Atlas 315', isOnline: false },
  { code: 'FLEET-408', name: 'Atlas 408', isOnline: false },
] as const;

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Operator.name)
    private readonly operatorModel: Model<Operator>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<Vehicle>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await Promise.all(
      OPERATORS.map((operator) =>
        this.operatorModel
          .updateOne(
            { employeeId: operator.employeeId },
            { $setOnInsert: operator },
            { upsert: true },
          )
          .exec(),
      ),
    );

    await Promise.all(
      VEHICLES.map((vehicle) =>
        this.vehicleModel
          .updateOne(
            { code: vehicle.code },
            { $setOnInsert: vehicle },
            { upsert: true },
          )
          .exec(),
      ),
    );
  }
}
