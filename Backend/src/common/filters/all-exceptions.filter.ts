import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

interface ErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string>;
  path: string;
  timestamp: string;
}

/**
 * Converts every thrown error into one consistent JSON shape.
 *
 * Critically, it also translates Prisma errors: an unhandled P2002 would
 * otherwise surface as a 500 containing column names and SQL details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errors } = this.resolve(exception);

    // 5xx is our bug and needs the stack; 4xx is the caller's and does not.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${message}`);
    }

    const body: ErrorBody = {
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    message: string;
    errors?: Record<string, string>;
  } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { status: exception.getStatus(), message: res };
      }
      const obj = res as { message?: string | string[]; errors?: Record<string, string> };
      return {
        status: exception.getStatus(),
        message: Array.isArray(obj.message)
          ? obj.message.join(', ')
          : (obj.message ?? exception.message),
        errors: obj.errors,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid query parameters',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      // Never surface a raw internal error message to the client.
      message: 'Internal server error',
    };
  }

  private resolvePrisma(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    errors?: Record<string, string>;
  } {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.['target'] as string[] | undefined) ?? [];
        const field = target.join(', ') || 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${field} already exists`,
          errors: Object.fromEntries(
            target.map((t) => [t, 'Already in use']),
          ),
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record does not exist',
        };
      default:
        this.logger.error(`Unhandled Prisma error ${error.code}`, error.message);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
        };
    }
  }
}
