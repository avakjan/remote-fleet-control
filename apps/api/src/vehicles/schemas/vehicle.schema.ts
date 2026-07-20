import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({ timestamps: true, versionKey: false })
export class Vehicle {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, default: false })
  isOnline!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Operator', required: false })
  assignedOperatorId?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

VehicleSchema.index(
  { assignedOperatorId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      assignedOperatorId: { $type: 'objectId' },
    },
  },
);
