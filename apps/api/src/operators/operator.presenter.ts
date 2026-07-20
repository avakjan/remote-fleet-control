import { OperatorDocument } from './schemas/operator.schema';

export interface OperatorResponse {
  id: string;
  employeeId: string;
  name: string;
}

export function presentOperator(operator: OperatorDocument): OperatorResponse {
  return {
    id: operator._id.toString(),
    employeeId: operator.employeeId,
    name: operator.name,
  };
}
