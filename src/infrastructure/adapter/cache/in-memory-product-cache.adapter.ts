import { Logger } from '@nestjs/common';
import type { ProductCachePort } from '../../../application/port/out/product-cache.port';
import type { ProductModel } from '../../../domain/model/product.model';
import { ProductPersistenceMapper } from '../mapper/product-persistence.mapper';

interface Entry {
  readonly value: string;
  readonly expiresAt: number;
}

/** Adaptador de desarrollo (`CACHE_PROVIDER=memory`): mismo comportamiento con TTL, sin Valkey. */
export class InMemoryProductCacheAdapter implements ProductCachePort {
  private readonly logger = new Logger(InMemoryProductCacheAdapter.name);
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly ttlSeconds: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(productId: string): Promise<ProductModel | null> {
    const entry = this.entries.get(productId);
    if (entry === undefined || entry.expiresAt <= this.now()) {
      this.entries.delete(productId);
      this.logger.log(`Cache MISS. clave=producto:${productId}`);
      return Promise.resolve(null);
    }
    this.logger.log(`Cache HIT. clave=producto:${productId}`);
    return Promise.resolve(ProductPersistenceMapper.fromJson(entry.value));
  }

  put(product: ProductModel): Promise<void> {
    this.entries.set(product.id, {
      value: ProductPersistenceMapper.toJson(product),
      expiresAt: this.now() + this.ttlSeconds * 1000,
    });
    return Promise.resolve();
  }

  evict(productId: string): Promise<void> {
    this.entries.delete(productId);
    return Promise.resolve();
  }
}
