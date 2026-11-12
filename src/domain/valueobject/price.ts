import { InvalidPriceException } from '../exception/invalid-price.exception';

const MAX_PRICE = 1_000_000_000;

/** Precio en pesos con máximo dos decimales. */
export class Price {
  private constructor(readonly value: number) {}

  static of(rawValue: number): Price {
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      throw InvalidPriceException.becauseMustBePositive();
    }
    if (rawValue > MAX_PRICE) {
      throw InvalidPriceException.becauseExceedsMaximum(MAX_PRICE);
    }
    if (Math.round(rawValue * 100) / 100 !== rawValue) {
      throw InvalidPriceException.becauseHasTooManyDecimals();
    }
    return new Price(rawValue);
  }
}
