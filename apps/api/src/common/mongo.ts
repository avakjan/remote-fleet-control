import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export function toObjectId(id: string, resource = 'id'): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`${resource} must be a valid MongoDB id`);
  }

  return new Types.ObjectId(id);
}
