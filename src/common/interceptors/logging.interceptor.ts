import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, headers, body, query } = request;
    const statusCode = response.statusCode;

    // Log Request
    this.logger.log(`==> REQUEST ${method} ${url}`);
    this.logger.log(`    Body: ${JSON.stringify(this.sanitizeBody(body))}`);
    if (query && Object.keys(query).length > 0) {
      this.logger.log(`    Query: ${JSON.stringify(query)}`);
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logger.log(`<== RESPONSE ${method} ${url} ${statusCode} (${Date.now() - now}ms)`);
          this.logger.log(`    Body: ${JSON.stringify(data)}`);
        },
        error: (error) => {
          this.logger.error(`<== ERROR ${method} ${url} ${statusCode} (${Date.now() - now}ms)`);
          this.logger.error(`    Error: ${error.message}`);
        },
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    // Remove sensitive headers
    delete sanitized['authorization'];
    delete sanitized['cookie'];
    delete sanitized['x-forwarded-for'];
    delete sanitized['x-real-ip'];
    // Truncate long headers
    if (sanitized['user-agent'] && sanitized['user-agent'].length > 100) {
      sanitized['user-agent'] = sanitized['user-agent'].substring(0, 100) + '...';
    }
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    const sanitized = { ...body };
    // Remove sensitive fields
    if (sanitized.password) sanitized.password = '***HIDDEN***';
    if (sanitized.token) sanitized.token = '***HIDDEN***';
    if (sanitized.accessToken) sanitized.accessToken = '***HIDDEN***';
    if (sanitized.refreshToken) sanitized.refreshToken = '***HIDDEN***';
    return sanitized;
  }
}