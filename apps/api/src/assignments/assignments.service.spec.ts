import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { OperatorsService } from '../operators/operators.service';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
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

  let service: AssignmentsService;
  let vehicleModel: {
    findOneAndUpdate: jest.Mock;
    findById: jest.Mock;
  };
  let operatorsService: {
    findDocument: jest.Mock;
  };

  beforeEach(async () => {
    vehicleModel = {
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
    };
    operatorsService = {
      findDocument: jest.fn().mockResolvedValue({ _id: operatorId }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: getModelToken(Vehicle.name),
          useValue: vehicleModel,
        },
        {
          provide: OperatorsService,
          useValue: operatorsService,
        },
      ],
    }).compile();

    service = module.get(AssignmentsService);
  });

  it('takes over only an online, unassigned vehicle atomically', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(vehicle),
    });

    await expect(
      service.takeover(vehicleId.toString(), operatorId.toString()),
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
      { new: true },
    );
  });

  it('rejects takeover when the vehicle is offline', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    vehicleModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...vehicle, isOnline: false }),
    });

    await expect(
      service.takeover(vehicleId.toString(), operatorId.toString()),
    ).rejects.toThrow('Offline vehicles cannot be taken over');
  });

  it('maps the unique assignment index violation to a conflict', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });

    await expect(
      service.takeover(vehicleId.toString(), operatorId.toString()),
    ).rejects.toEqual(
      new ConflictException('Operator is already assigned to another vehicle'),
    );
  });

  it('releases only when the requesting operator owns the assignment', async () => {
    vehicleModel.findOneAndUpdate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ ...vehicle, assignedOperatorId: undefined }),
    });

    await expect(
      service.release(vehicleId.toString(), operatorId.toString()),
    ).resolves.toMatchObject({ assignedOperatorId: null });

    expect(vehicleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: vehicleId, assignedOperatorId: operatorId },
      { $unset: { assignedOperatorId: '' } },
      { new: true },
    );
  });
});
