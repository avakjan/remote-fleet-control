import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  const vehicleId = new Types.ObjectId();
  const operatorId = new Types.ObjectId();
  const now = new Date('2026-07-20T12:00:00.000Z');
  const vehicle = {
    _id: vehicleId,
    code: 'FLEET-101',
    name: 'Atlas 101',
    isOnline: true,
    assignedOperatorId: operatorId,
    createdAt: now,
    updatedAt: now,
  };

  let service: VehiclesService;
  let vehicleModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    vehicleModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getModelToken(Vehicle.name),
          useValue: vehicleModel,
        },
      ],
    }).compile();

    service = module.get(VehiclesService);
  });

  it('assigns only an online, unassigned vehicle atomically', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue(query(vehicle));

    await expect(
      service.assignOperator(vehicleId.toString(), operatorId),
    ).resolves.toMatchObject({
      id: vehicleId.toString(),
      assignedOperatorId: operatorId.toString(),
    });

    expect(vehicleModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: vehicleId,
        isOnline: true,
        assignedOperatorId: { $exists: false },
      },
      { $set: { assignedOperatorId: operatorId } },
      { returnDocument: 'after' },
    );
  });

  it('maps a duplicate assignment index violation to a conflict', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue(
      rejectedQuery({ code: 11000 }),
    );

    await expect(
      service.assignOperator(vehicleId.toString(), operatorId),
    ).rejects.toEqual(
      new ConflictException('Operator is already assigned to another vehicle'),
    );
  });

  it('rejects assigning an offline vehicle', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue(query(null));
    vehicleModel.findById.mockReturnValue(
      query({ ...vehicle, isOnline: false, assignedOperatorId: undefined }),
    );

    await expect(
      service.assignOperator(vehicleId.toString(), operatorId),
    ).rejects.toThrow('Offline vehicles cannot be taken over');
  });

  it('releases only the operator that owns the assignment', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue(
      query({ ...vehicle, assignedOperatorId: undefined }),
    );

    await expect(
      service.releaseOperator(vehicleId.toString(), operatorId),
    ).resolves.toMatchObject({ assignedOperatorId: null });

    expect(vehicleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: vehicleId, assignedOperatorId: operatorId },
      { $unset: { assignedOperatorId: '' } },
      { returnDocument: 'after' },
    );
  });

  it('rejects taking an assigned vehicle offline', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue(query(null));
    vehicleModel.findById.mockReturnValue(query(vehicle));

    await expect(
      service.update(vehicleId.toString(), { isOnline: false }),
    ).rejects.toThrow(
      'Assigned vehicle must be released before it can go offline',
    );
  });

  it('rejects deleting an assigned vehicle', async () => {
    vehicleModel.findOneAndDelete.mockReturnValue(query(null));
    vehicleModel.findById.mockReturnValue(query(vehicle));

    await expect(service.remove(vehicleId.toString())).rejects.toThrow(
      'Assigned vehicle must be released before it can be deleted',
    );
  });
});

function query<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function rejectedQuery(error: unknown) {
  return { exec: jest.fn().mockRejectedValue(error) };
}
