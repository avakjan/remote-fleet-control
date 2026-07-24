import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Operator } from '../src/operators/schemas/operator.schema';
import { Vehicle } from '../src/vehicles/schemas/vehicle.schema';

jest.setTimeout(30_000);

type VehicleResponse = {
  id: string;
  assignedOperatorId: string | null;
};

type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
};

describe('Fleet API (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let operatorModel: Model<Operator>;
  let vehicleModel: Model<Vehicle>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { enableShutdownHooks: false });
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    operatorModel = moduleFixture.get<Model<Operator>>(
      getModelToken(Operator.name),
    );
    vehicleModel = moduleFixture.get<Model<Vehicle>>(
      getModelToken(Vehicle.name),
    );
    await Promise.all([
      operatorModel.syncIndexes(),
      vehicleModel.syncIndexes(),
    ]);
  });

  beforeEach(async () => {
    await Promise.all([
      operatorModel.deleteMany({}),
      vehicleModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  it('reports service health', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('takes over and releases a vehicle', async () => {
    const operator = await createOperator('OP-101');
    const vehicle = await createVehicle('TEST-101');

    const takeover = await request(app.getHttpServer())
      .post(`/api/vehicles/${vehicle.id}/takeover`)
      .send({ operatorId: operator._id.toString() })
      .expect(200);

    const takeoverBody = takeover.body as VehicleResponse;
    expect(takeoverBody.assignedOperatorId).toBe(operator._id.toString());

    const release = await request(app.getHttpServer())
      .post(`/api/vehicles/${vehicle.id}/release`)
      .send({ operatorId: operator._id.toString() })
      .expect(200);

    const releaseBody = release.body as VehicleResponse;
    expect(releaseBody.assignedOperatorId).toBeNull();
  });

  it('rejects taking an assigned vehicle offline with the documented error shape', async () => {
    const operator = await createOperator('OP-201');
    const vehicle = await createVehicle('TEST-201');

    await request(app.getHttpServer())
      .post(`/api/vehicles/${vehicle.id}/takeover`)
      .send({ operatorId: operator._id.toString() })
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch(`/api/vehicles/${vehicle.id}`)
      .send({ isOnline: false })
      .expect(409);

    const errorBody = response.body as ErrorResponse;
    expect(errorBody).toMatchObject({
      statusCode: 409,
      error: 'CONFLICT',
      message: 'Assigned vehicle must be released before it can go offline',
      path: `/api/vehicles/${vehicle.id}`,
    });
    expect(errorBody.timestamp).toEqual(expect.any(String));
  });

  it('allows only one vehicle when the same operator takes over concurrently', async () => {
    const operator = await createOperator('OP-301');
    const firstVehicle = await createVehicle('TEST-301');
    const secondVehicle = await createVehicle('TEST-302');
    const body = { operatorId: operator._id.toString() };

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/vehicles/${firstVehicle.id}/takeover`)
        .send(body),
      request(app.getHttpServer())
        .post(`/api/vehicles/${secondVehicle.id}/takeover`)
        .send(body),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const conflict = responses.find(({ status }) => status === 409)?.body as
      ErrorResponse | undefined;
    expect(conflict?.message).toBe(
      'Operator is already assigned to another vehicle',
    );
  });

  it('allows only one operator to take over the same vehicle concurrently', async () => {
    const firstOperator = await createOperator('OP-401');
    const secondOperator = await createOperator('OP-402');
    const vehicle = await createVehicle('TEST-401');

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/vehicles/${vehicle.id}/takeover`)
        .send({ operatorId: firstOperator._id.toString() }),
      request(app.getHttpServer())
        .post(`/api/vehicles/${vehicle.id}/takeover`)
        .send({ operatorId: secondOperator._id.toString() }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const conflict = responses.find(({ status }) => status === 409)?.body as
      ErrorResponse | undefined;
    expect(conflict?.message).toBe('Vehicle is already assigned');
  });

  async function createOperator(employeeId: string) {
    return operatorModel.create({ employeeId, name: `Operator ${employeeId}` });
  }

  async function createVehicle(code: string) {
    const response = await request(app.getHttpServer())
      .post('/api/vehicles')
      .send({ code, name: `Vehicle ${code}`, isOnline: true })
      .expect(201);
    return response.body as VehicleResponse;
  }
});
