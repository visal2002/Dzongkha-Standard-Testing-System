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
    const body = this.normalizedBody(raw);
    this.logIfUnexpected(exception, request);
    response.status(status).json({ success: false, error: this.errorPayload(status, body, raw, request.id) });
  }

  /** `HttpException.getResponse()` may be a plain string; only an object carries `code`/`message`/`details`. */
  private normalizedBody(raw: unknown): Record<string, any> {
    return typeof raw === 'object' && raw !== null ? (raw as Record<string, any>) : {};
  }

  /** Class-validator reports multiple failures as a `message` array; every other exception shape gives a single string. */
  private validationMessage(body: Record<string, any>): string | undefined {
    const message: unknown = body.message;
    return Array.isArray(message) ? message.join('; ') : (message as string | undefined);
  }

  /** Anything that did not arrive as a deliberate `HttpException` is an unexpected failure worth the stack trace. */
  private logIfUnexpected(exception: unknown, request: Request): void {
    if (exception instanceof HttpException) return;
    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`${request.method} ${request.originalUrl} failed [requestId=${request.id}]`, error.stack);
  }

  private errorPayload(status: number, body: Record<string, any>, raw: unknown, requestId: string) {
    return {
      code: body.code ?? (status === 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`),
      message: this.validationMessage(body) ?? (status === 500 ? 'An unexpected error occurred.' : String(raw)),
      requestId,
      details: body.details ?? {},
    };
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
