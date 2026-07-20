import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface NestErrorResponse {
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      error: this.errorCode(status),
      message: this.message(exception),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private message(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    return (response as NestErrorResponse).message ?? exception.message;
  }

  private errorCode(status: number): string {
    return (
      {
        [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
        [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
        [HttpStatus.CONFLICT]: 'CONFLICT',
      }[status] ?? 'INTERNAL_SERVER_ERROR'
    );
  }
}
