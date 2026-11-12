import type {
  ProductImageStoragePort,
  SignedImageUrl,
} from '../../../application/port/out/product-image-storage.port';
import type { ProductImage } from '../../../domain/valueobject/product-image';

const IMAGES_PREFIX = 'images/';

/**
 * Adaptador de desarrollo (`STORAGE_PROVIDER=memory`). En lugar de una URL firmada
 * devuelve un data URL, que el navegador puede abrir directamente.
 */
export class InMemoryProductImageStorageAdapter implements ProductImageStoragePort {
  private readonly images = new Map<string, ProductImage>();

  constructor(private readonly signedUrlTtlSeconds: number) {}

  upload(productId: string, image: ProductImage): Promise<string> {
    const key = `${IMAGES_PREFIX}${productId}`;
    this.images.set(key, image);
    return Promise.resolve(key);
  }

  delete(imageKey: string): Promise<void> {
    this.images.delete(imageKey);
    return Promise.resolve();
  }

  createDownloadUrl(imageKey: string): Promise<SignedImageUrl> {
    const image = this.images.get(imageKey);
    const url = image
      ? `data:${image.contentType};base64,${Buffer.from(image.content).toString('base64')}`
      : '';
    return Promise.resolve({ url, expiresInSeconds: this.signedUrlTtlSeconds });
  }
}
