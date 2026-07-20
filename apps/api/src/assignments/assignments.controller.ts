import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { AssignmentDto } from './dto/assignment.dto';
import { AssignmentsService } from './assignments.service';

@Controller('vehicles')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post(':id/takeover')
  @HttpCode(HttpStatus.OK)
  takeover(@Param('id') id: string, @Body() dto: AssignmentDto) {
    return this.assignmentsService.takeover(id, dto.operatorId);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@Param('id') id: string, @Body() dto: AssignmentDto) {
    return this.assignmentsService.release(id, dto.operatorId);
  }
}
