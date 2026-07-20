import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OperatorDocument = HydratedDocument<Operator>;

@Schema({ timestamps: true, versionKey: false })
export class Operator {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  employeeId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OperatorSchema = SchemaFactory.createForClass(Operator);
