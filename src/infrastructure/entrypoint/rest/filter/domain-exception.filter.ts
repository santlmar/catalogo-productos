import {
  Catch,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainException } from '../../../../domain/exception/domain.exception';
import { FileStorageException } from '../../../../domain/exception/file-storage.exception';
import { ProductImageNotFoundException } from '../../../../domain/exception/product-image-not-found.exception';
import { ProductNotFoundException } from '../../../../domain/exception/product-not-found.exception';

/** Traduce las excepciones del dominio a respuestas HTTP con un cuerpo uniforme. */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  static statusOf(exception: DomainException): HttpStatus {
    if (
      exception instanceof ProductNotFoundException ||
      exception instanceof ProductImageNotFoundException
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof FileStorageException) {
      return HttpStatus.BAD_GATEWAY;
    }
    return HttpStatus.BAD_REQUEST;
  }

  catch(exception: DomainException, host: ArgumentsHost): void {
    const status = DomainExceptionFilter.statusOf(exception);
    if (status === HttpStatus.BAD_GATEWAY) {
      const cause =
        exception.cause instanceof Error
          ? exception.cause.message
          : 'desconocida';
      this.logger.error(`${exception.message} causa=${cause}`);
    }
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
