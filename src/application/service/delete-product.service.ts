import { Inject, Injectable } from '@nestjs/common';
import { ProductDeletedDomainEvent } from '../../domain/event/product-deleted.domain-event';
import { ProductNotFoundException } from '../../domain/exception/product-not-found.exception';
import type { DeleteProductUseCase } from '../port/in/delete-product.use-case';
import {
  PRODUCT_CACHE_PORT,
  type ProductCachePort,
} from '../port/out/product-cache.port';
import {
  PRODUCT_EVENT_PUBLISHER_PORT,
  type ProductEventPublisherPort,
} from '../port/out/product-event-publisher.port';
import {
  PRODUCT_IMAGE_STORAGE_PORT,
  type ProductImageStoragePort,
} from '../port/out/product-image-storage.port';
import {
  PRODUCT_REPOSITORY_PORT,
  type ProductRepositoryPort,
} from '../port/out/product-repository.port';

@Injectable()
export class DeleteProductService implements DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly repository: ProductRepositoryPort,
    @Inject(PRODUCT_IMAGE_STORAGE_PORT)
    private readonly imageStorage: ProductImageStoragePort,
    @Inject(PRODUCT_CACHE_PORT) private readonly cache: ProductCachePort,
    @Inject(PRODUCT_EVENT_PUBLISHER_PORT)
    private readonly publisher: ProductEventPublisherPort,
  ) {}

  async execute(productId: string): Promise<void> {
    const product = await this.repository.findById(productId);
    if (product === null) {
      throw ProductNotFoundException.becauseIdDoesNotExist(productId);
    }
    if (product.imageKey !== null) {
      await this.imageStorage.delete(product.imageKey);
    }
    await this.repository.delete(productId);
    await this.cache.evict(productId);
    await this.publisher.publish(
      new ProductDeletedDomainEvent(productId, new Date()),
    );
  }
}
