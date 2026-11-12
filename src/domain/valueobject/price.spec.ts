import { InvalidPriceException } from '../exception/invalid-price.exception';
import { Price } from './price';

describe('Price', () => {
  it.each([0.01, 1, 19.99, 45000, 1_000_000_000])(
    'debe aceptar el precio válido %p',
    (raw) => {
      // Act
      const price = Price.of(raw);

      // Assert
      expect(price.value).toBe(raw);
    },
  );

  it.each([
    0,
    -5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1_000_000_000.01,
    10.999,
  ])('debe rechazar el precio inválido %p', (raw) => {
    // Act & Assert
    expect(() => Price.of(raw)).toThrow(expect.any(InvalidPriceException));
  });
});
