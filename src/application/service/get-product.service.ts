import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundException } from '../../domain/exception/product-not-found.exception';
import type { GetProductUseCase } from '../port/in/get-product.use-case';
import {
  PRODUCT_CACHE_PORT,
  type ProductCachePort,
} from '../port/out/product-cache.port';
import {
  PRODUCT_REPOSITORY_PORT,
  type ProductRepositoryPort,
} from '../port/out/product-repository.port';
import { ProductLookupResult } from './dto/result/product-lookup.result';

/**
 * Cache-aside (Guía 10): primero se consulta Valkey; si no está, se lee del
 * bucket y se guarda en caché con TTL para las siguientes consultas.
 */
@Injectable()
export class GetProductService implements GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly repository: ProductRepositoryPort,
    @Inject(PRODUCT_CACHE_PORT) private readonly cache: ProductCachePort,
  ) {}

  async execute(productId: string): Promise<ProductLookupResult> {
    const cached = await this.cache.get(productId);
    if (cached !== null) {
      return new ProductLookupResult(cached, 'cache');
    }
    const product = await this.repository.findById(productId);
    if (product === null) {
      throw ProductNotFoundException.becauseIdDoesNotExist(productId);
    }
    await this.cache.put(product);
    return new ProductLookupResult(product, 'storage');
  }
}
