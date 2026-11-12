import { Inject, Injectable } from '@nestjs/common';
import { ProductUpdatedDomainEvent } from '../../domain/event/product-updated.domain-event';
import { ProductNotFoundException } from '../../domain/exception/product-not-found.exception';
import type { ProductModel } from '../../domain/model/product.model';
import type { UpdateProductUseCase } from '../port/in/update-product.use-case';
import {
  PRODUCT_CACHE_PORT,
  type ProductCachePort,
} from '../port/out/product-cache.port';
import {
  PRODUCT_EVENT_PUBLISHER_PORT,
  type ProductEventPublisherPort,
} from '../port/out/product-event-publisher.port';
import {
  PRODUCT_REPOSITORY_PORT,
  type ProductRepositoryPort,
} from '../port/out/product-repository.port';
import type { UpdateProductCommand } from './dto/command/update-product.command';
import { ProductApplicationMapper } from './mapper/product-application.mapper';

@Injectable()
export class UpdateProductService implements UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly repository: ProductRepositoryPort,
    @Inject(PRODUCT_CACHE_PORT) private readonly cache: ProductCachePort,
    @Inject(PRODUCT_EVENT_PUBLISHER_PORT)
    private readonly publisher: ProductEventPublisherPort,
  ) {}

  async execute(command: UpdateProductCommand): Promise<ProductModel> {
    // Se lee de la fuente de verdad, nunca de la caché, para no partir de datos viejos.
    const current = await this.repository.findById(command.productId);
    if (current === null) {
      throw ProductNotFoundException.becauseIdDoesNotExist(command.productId);
    }
    const now = new Date();
    const updated = current.update(
      ProductApplicationMapper.toDetails(command),
      now,
    );
    await this.repository.save(updated);
    await this.cache.evict(updated.id);
    await this.publisher.publish(new ProductUpdatedDomainEvent(updated, now));
    return updated;
  }
}
