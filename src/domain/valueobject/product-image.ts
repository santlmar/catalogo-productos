import { InvalidProductImageException } from '../exception/invalid-product-image.exception';

const ALLOWED_CONTENT_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Archivo de imagen de un producto, validado antes de subirlo al bucket. */
export class ProductImage {
  /** 2 MB: suficiente para una foto de catálogo y cuida la cuota gratuita de B2. */
  static readonly MAX_BYTES = 2 * 1024 * 1024;

  private constructor(
    readonly content: Uint8Array,
    readonly contentType: string,
  ) {}

  static of(content: Uint8Array, rawContentType: string): ProductImage {
    if (content.byteLength === 0) {
      throw InvalidProductImageException.becauseFileIsEmpty();
    }
    if (content.byteLength > ProductImage.MAX_BYTES) {
      throw InvalidProductImageException.becauseFileIsTooLarge(
        ProductImage.MAX_BYTES,
      );
    }
    const contentType = rawContentType.trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw InvalidProductImageException.becauseContentTypeIsNotAllowed(
        ALLOWED_CONTENT_TYPES,
      );
    }
    return new ProductImage(content, contentType);
  }

  get sizeInBytes(): number {
    return this.content.byteLength;
  }
}
