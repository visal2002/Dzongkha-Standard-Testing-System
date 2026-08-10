/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';

export class DomainException extends HttpException {
  constructor(code: string, message: string, status = HttpStatus.BAD_REQUEST, details = {}) {
    super({ code, message, details }, status);
  }
}

export const RawResponse = () => SetMetadata('rawResponse', true);

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/metrics' || Reflect.getMetadata('rawResponse', context.getHandler()) === true) return next.handle();
    return next.handle().pipe(
      map((data) => ({ success: true, data, message: 'OK', requestId: request.id })),
    );
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof raw === 'object' && raw !== null ? (raw as Record<string, any>) : {};
    const validationMessage = Array.isArray(body.message) ? body.message.join('; ') : body.message;
    if (!(exception instanceof HttpException)) {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`${request.method} ${request.originalUrl} failed [requestId=${request.id}]`, error.stack);
    }
    response.status(status).json({
      success: false,
      error: {
        code: body.code ?? (status === 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`),
        message: validationMessage ?? (status === 500 ? 'An unexpected error occurred.' : String(raw)),
        requestId: request.id,
        details: body.details ?? {},
      },
    });
  }
}

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: import('@dzongjuk/contracts').AccessClaims;
    }
  }
}
