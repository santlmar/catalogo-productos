import type { ProductModel } from '../../../domain/model/product.model';

export const PRODUCT_REPOSITORY_PORT = Symbol('ProductRepositoryPort');

/** Almacenamiento principal (fuente de verdad) de los productos. */
export interface ProductRepositoryPort {
  /** @throws FileStorageException si el almacenamiento no responde. */
  save(product: ProductModel): Promise<void>;

  /** Devuelve `null` si el producto no existe. */
  findById(productId: string): Promise<ProductModel | null>;

  delete(productId: string): Promise<void>;
}
