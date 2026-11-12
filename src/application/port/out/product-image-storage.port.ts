import type { ProductImage } from '../../../domain/valueobject/product-image';

export const PRODUCT_IMAGE_STORAGE_PORT = Symbol('ProductImageStoragePort');

export interface SignedImageUrl {
  readonly url: string;
  readonly expiresInSeconds: number;
}

/** Bucket privado donde viven las imágenes de los productos. */
export interface ProductImageStoragePort {
  /**
   * Sube (o reemplaza) la imagen del producto.
   * @returns la clave del objeto dentro del bucket.
   * @throws FileStorageException
   */
  upload(productId: string, image: ProductImage): Promise<string>;

  delete(imageKey: string): Promise<void>;

  /** URL temporal de descarga: el bucket es privado, nunca se expone directamente. */
  createDownloadUrl(imageKey: string): Promise<SignedImageUrl>;
}
