import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { toObjectId } from '../common/mongo';
import { Operator, OperatorDocument } from './schemas/operator.schema';
import { OperatorResponse, presentOperator } from './operator.presenter';

@Injectable()
export class OperatorsService {
  constructor(
    @InjectModel(Operator.name)
    private readonly operatorModel: Model<Operator>,
  ) {}

  async findAll(): Promise<OperatorResponse[]> {
    const operators = await this.operatorModel
      .find()
      .sort({ employeeId: 1 })
      .exec();
    return operators.map(presentOperator);
  }

  async findDocument(id: string): Promise<OperatorDocument | null> {
    return this.operatorModel.findById(toObjectId(id, 'operatorId')).exec();
  }
}
