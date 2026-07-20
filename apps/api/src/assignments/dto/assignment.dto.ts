import { IsMongoId } from 'class-validator';

export class AssignmentDto {
  @IsMongoId()
  operatorId!: string;
}
