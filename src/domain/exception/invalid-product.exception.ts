import { DomainException } from './domain.exception';

export class InvalidProductException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseFieldIsBlank(fieldName: string): InvalidProductException {
    return new InvalidProductException(
      `El campo "${fieldName}" del producto es requerido.`,
    );
  }

  static becauseFieldIsTooLong(
    fieldName: string,
    maxLength: number,
  ): InvalidProductException {
    return new InvalidProductException(
      `El campo "${fieldName}" del producto admite como máximo ${maxLength} caracteres.`,
    );
  }

  static becauseFieldHasInvalidType(
    fieldName: string,
    expected: string,
  ): InvalidProductException {
    return new InvalidProductException(
      `El campo "${fieldName}" del producto debe ser de tipo ${expected}.`,
    );
  }
}
