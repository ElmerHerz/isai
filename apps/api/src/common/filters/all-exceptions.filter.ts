import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error?: string;
  /** Código discriminante opcional (ej. MUST_CHANGE_PASSWORD) para que el
   * frontend distinga casos especiales sin parsear el texto de `message`. */
  code?: string;
}

/**
 * HttpExceptionFilter — Formato uniforme de errores en toda la API.
 *
 * Todos los errores devuelven:
 * {
 *   "statusCode": 400,
 *   "timestamp": "2024-01-01T00:00:00.000Z",
 *   "path": "/api/v1/tenants",
 *   "message": "Descripción del error",
 *   "error": "Bad Request"
 * }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { send: (body: ErrorResponse) => void };
    }>();
    const request = ctx.getRequest<{ url: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Para excepciones NO-HTTP (status >= 500: error de Prisma/driver no
    // capturado, timeout, etc.) nunca se manda exception.message crudo al
    // cliente — puede filtrar nombres de tabla/columna, fragmentos de query
    // u otros detalles internos (hallazgo de auditoría de sesión). El
    // mensaje real solo va al log del servidor (líneas de abajo); el
    // cliente recibe un mensaje genérico.
    const message =
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
        ? (exceptionResponse as { message: string | string[] }).message
        : 'Ocurrió un error inesperado. Intenta de nuevo.';

    const code =
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'code' in exceptionResponse
        ? (exceptionResponse as { code: string }).code
        : undefined;

    const errorBody: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(code ? { code } : {}),
    };

    if (status >= 500) {
      this.logger.error(
        `${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).send(errorBody);
  }
}
