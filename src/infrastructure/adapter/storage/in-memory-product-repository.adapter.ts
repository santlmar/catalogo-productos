import type { ProductRepositoryPort } from '../../../application/port/out/product-repository.port';
import type { ProductModel } from '../../../domain/model/product.model';
import { ProductPersistenceMapper } from '../mapper/product-persistence.mapper';

/**
 * Adaptador de desarrollo (`STORAGE_PROVIDER=memory`). Guarda el mismo JSON que
 * se enviaría a B2, pero en memoria: los datos se pierden al reiniciar.
 */
export class InMemoryProductRepositoryAdapter implements ProductRepositoryPort {
  private readonly documents = new Map<string, string>();

  save(product: ProductModel): Promise<void> {
    this.documents.set(product.id, ProductPersistenceMapper.toJson(product));
    return Promise.resolve();
  }

  findById(productId: string): Promise<ProductModel | null> {
    const raw = this.documents.get(productId);
    return Promise.resolve(
      raw === undefined ? null : ProductPersistenceMapper.fromJson(raw),
    );
  }

  delete(productId: string): Promise<void> {
    this.documents.delete(productId);
    return Promise.resolve();
  }
}
