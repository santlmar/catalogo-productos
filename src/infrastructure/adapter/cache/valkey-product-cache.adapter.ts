import { Logger, type OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { ProductCachePort } from '../../../application/port/out/product-cache.port';
import type { ProductModel } from '../../../domain/model/product.model';
import { ProductPersistenceMapper } from '../mapper/product-persistence.mapper';

/** Mismo esquema de nombres que la Guía 10 (`cliente:1001:estado`): `producto:<id>`. */
const KEY_PREFIX = 'producto:';

/**
 * Guía 10: caché distribuida en Valkey (Aiven). Cada producto se guarda como un
 * String JSON con TTL. La instancia usa `allkeys-lru`, así que una clave puede
 * desaparecer antes de su TTL: por eso cualquier fallo se trata como MISS.
 */
export class ValkeyProductCacheAdapter
  implements ProductCachePort, OnModuleDestroy
{
  private readonly logger = new Logger(ValkeyProductCacheAdapter.name);

  constructor(
    private readonly client: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async get(productId: string): Promise<ProductModel | null> {
    const key = this.keyOf(productId);
    let raw: string | null;
    try {
      raw = await this.client.get(key);
    } catch (error) {
      this.logFailure('leer', key, error);
      return null;
    }
    if (raw === null) {
      this.logger.log(`Cache MISS. clave=${key}`);
      return null;
    }
    try {
      const product = ProductPersistenceMapper.fromJson(raw);
      this.logger.log(`Cache HIT. clave=${key}`);
      return product;
    } catch {
      this.logger.warn(`Entrada de caché corrupta, se descarta. clave=${key}`);
      await this.evict(productId);
      return null;
    }
  }

  async put(product: ProductModel): Promise<void> {
    const key = this.keyOf(product.id);
    try {
      await this.client.set(
        key,
        ProductPersistenceMapper.toJson(product),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      this.logFailure('escribir', key, error);
    }
  }

  async evict(productId: string): Promise<void> {
    const key = this.keyOf(productId);
    try {
      await this.client.del(key);
    } catch (error) {
      this.logFailure('invalidar', key, error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  private keyOf(productId: string): string {
    return `${KEY_PREFIX}${productId}`;
  }

  private logFailure(operation: string, key: string, error: unknown): void {
    const cause = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `No se pudo ${operation} en Valkey; se continúa sin caché. clave=${key} causa=${cause}`,
    );
  }
}
