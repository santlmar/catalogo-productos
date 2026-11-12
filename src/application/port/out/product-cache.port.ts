import type { ProductModel } from '../../../domain/model/product.model';

export const PRODUCT_CACHE_PORT = Symbol('ProductCachePort');

/**
 * Caché distribuida de productos (patrón cache-aside).
 * Nunca lanza errores: si la caché no responde se comporta como un fallo de caché,
 * porque los datos siempre se pueden recuperar del almacenamiento principal.
 */
export interface ProductCachePort {
  get(productId: string): Promise<ProductModel | null>;

  put(product: ProductModel): Promise<void>;

  evict(productId: string): Promise<void>;
}
