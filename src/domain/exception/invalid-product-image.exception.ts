import { DomainException } from './domain.exception';

export class InvalidProductImageException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseFileIsMissing(): InvalidProductImageException {
    return new InvalidProductImageException(
      'Se debe adjuntar la imagen en el campo "file" (multipart/form-data).',
    );
  }

  static becauseFileIsEmpty(): InvalidProductImageException {
    return new InvalidProductImageException(
      'La imagen del producto está vacía.',
    );
  }

  static becauseFileIsTooLarge(maxBytes: number): InvalidProductImageException {
    return new InvalidProductImageException(
      `La imagen del producto supera el tamaño máximo de ${maxBytes} bytes.`,
    );
  }

  static becauseContentTypeIsNotAllowed(
    allowed: readonly string[],
  ): InvalidProductImageException {
    return new InvalidProductImageException(
      `El tipo de imagen no está permitido. Tipos válidos: ${allowed.join(', ')}.`,
    );
  }
}
