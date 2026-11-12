import { DomainException } from './domain.exception';

export class InvalidPriceException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseMustBePositive(): InvalidPriceException {
    return new InvalidPriceException(
      'El precio debe ser un número mayor que cero.',
    );
  }

  static becauseExceedsMaximum(maximum: number): InvalidPriceException {
    return new InvalidPriceException(`El precio no puede superar ${maximum}.`);
  }

  static becauseHasTooManyDecimals(): InvalidPriceException {
    return new InvalidPriceException(
      'El precio admite como máximo dos decimales.',
    );
  }
}
