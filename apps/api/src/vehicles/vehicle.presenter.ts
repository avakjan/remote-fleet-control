import { VehicleDocument } from './schemas/vehicle.schema';

export interface VehicleResponse {
  id: string;
  code: string;
  name: string;
  isOnline: boolean;
  assignedOperatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function presentVehicle(vehicle: VehicleDocument): VehicleResponse {
  return {
    id: vehicle._id.toString(),
    code: vehicle.code,
    name: vehicle.name,
    isOnline: vehicle.isOnline,
    assignedOperatorId: vehicle.assignedOperatorId?.toString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}
