import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Single source of truth for error responses. Produces a consistent JSON shape, maps known
 * Prisma errors to sensible HTTP codes, and never leaks stack traces or internals to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log the real cause server-side; the client only sees a generic message.
      this.logger.error(`${request.method} ${request.url}`, exception as Error);
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { status, error: this.reason(status), message: res };
      }
      // Nest puts validation messages under `message` (often an array) and the standard reason
      // phrase under `error` (e.g. "Forbidden") for built-in exceptions — prefer those.
      const body = res as { message?: string | string[]; error?: string };
      return {
        status,
        error: typeof body.error === 'string' ? body.error : this.reason(status),
        message: body.message ?? exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: 'A record with these details already exists',
          };
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: 'The requested resource was not found',
          };
        default:
          break;
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Something went wrong',
    };
  }

  private reason(status: number): string {
    const key = HttpStatus[status];
    if (key === undefined) return 'Error';
    // "TOO_MANY_REQUESTS" -> "Too Many Requests"
    return String(key)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
