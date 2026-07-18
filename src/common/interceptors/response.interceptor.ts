import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data: any) => {
        if (data === undefined || data === null) {
          return {
            success: true,
            statusCode: response.statusCode,
            message: 'Success',
            timestamp: new Date().toISOString(),
          };
        }

        // Handle legacy paginated payloads
        if (data && data.data && (data.totalItems !== undefined || data.totalPages !== undefined)) {
          return {
            success: true,
            statusCode: response.statusCode,
            message: data.message ?? 'Success',
            data: data.data,
            meta: {
              page: data.currentPage || 1,
              limit: data.limit || 10,
              total: data.totalItems || 0,
              totalPages: data.totalPages || 1,
              hasNext: (data.currentPage || 1) < (data.totalPages || 1),
              hasPrevious: (data.currentPage || 1) > 1,
            },
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message: data?.message ?? 'Success',
          data: data?.data ?? data,
          meta: data?.meta,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
