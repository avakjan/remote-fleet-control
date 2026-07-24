import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { OperatorsService } from '../operators/operators.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
  const vehicleId = new Types.ObjectId().toString();
  const operatorId = new Types.ObjectId();

  let service: AssignmentsService;
  let operatorsService: {
    findDocument: jest.Mock;
  };
  let vehiclesService: {
    assignOperator: jest.Mock;
    releaseOperator: jest.Mock;
  };

  beforeEach(async () => {
    operatorsService = {
      findDocument: jest.fn().mockResolvedValue({ _id: operatorId }),
    };
    vehiclesService = {
      assignOperator: jest.fn().mockResolvedValue({ id: vehicleId }),
      releaseOperator: jest.fn().mockResolvedValue({ id: vehicleId }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: OperatorsService, useValue: operatorsService },
        { provide: VehiclesService, useValue: vehiclesService },
      ],
    }).compile();

    service = module.get(AssignmentsService);
  });

  it('delegates takeover with the resolved operator id', async () => {
    await service.takeover(vehicleId, operatorId.toString());

    expect(vehiclesService.assignOperator).toHaveBeenCalledWith(
      vehicleId,
      operatorId,
    );
  });

  it('delegates release with the resolved operator id', async () => {
    await service.release(vehicleId, operatorId.toString());

    expect(vehiclesService.releaseOperator).toHaveBeenCalledWith(
      vehicleId,
      operatorId,
    );
  });

  it('rejects assignment actions for an unknown operator', async () => {
    operatorsService.findDocument.mockResolvedValue(null);

    await expect(
      service.takeover(vehicleId, operatorId.toString()),
    ).rejects.toEqual(new NotFoundException('Operator not found'));
    expect(vehiclesService.assignOperator).not.toHaveBeenCalled();
  });
});
