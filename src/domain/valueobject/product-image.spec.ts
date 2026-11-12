import { InvalidProductImageException } from '../exception/invalid-product-image.exception';
import { ProductImage } from './product-image';

describe('ProductImage', () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it.each(['image/jpeg', 'image/png', 'image/webp', ' IMAGE/PNG '])(
    'debe aceptar el tipo %p y normalizarlo',
    (contentType) => {
      // Act
      const image = ProductImage.of(bytes, contentType);

      // Assert
      expect(image.contentType).toBe(contentType.trim().toLowerCase());
      expect(image.sizeInBytes).toBe(3);
    },
  );

  it('debe rechazar un archivo vacío', () => {
    expect(() => ProductImage.of(new Uint8Array(), 'image/png')).toThrow(
      expect.any(InvalidProductImageException),
    );
  });

  it('debe rechazar un archivo que supere el tamaño máximo', () => {
    // Arrange
    const tooLarge = new Uint8Array(ProductImage.MAX_BYTES + 1);

    // Act & Assert
    expect(() => ProductImage.of(tooLarge, 'image/png')).toThrow(
      /tamaño máximo/,
    );
  });

  it.each(['application/pdf', 'image/gif', 'text/html', ''])(
    'debe rechazar el tipo no permitido %p',
    (contentType) => {
      expect(() => ProductImage.of(bytes, contentType)).toThrow(
        /no está permitido/,
      );
    },
  );
});
