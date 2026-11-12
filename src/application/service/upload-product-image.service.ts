import { Inject, Injectable } from '@nestjs/common';
import { ProductUpdatedDomainEvent } from '../../domain/event/product-updated.domain-event';
import { ProductNotFoundException } from '../../domain/exception/product-not-found.exception';
import type { ProductModel } from '../../domain/model/product.model';
import { ProductImage } from '../../domain/valueobject/product-image';
import type { UploadProductImageUseCase } from '../port/in/upload-product-image.use-case';
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
import type { UploadProductImageCommand } from './dto/command/upload-product-image.command';

/** Guía 9: la imagen se guarda en el bucket privado de Backblaze B2. */
@Injectable()
export class UploadProductImageService implements UploadProductImageUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly repository: ProductRepositoryPort,
    @Inject(PRODUCT_IMAGE_STORAGE_PORT)
    private readonly imageStorage: ProductImageStoragePort,
    @Inject(PRODUCT_CACHE_PORT) private readonly cache: ProductCachePort,
    @Inject(PRODUCT_EVENT_PUBLISHER_PORT)
    private readonly publisher: ProductEventPublisherPort,
  ) {}

  async execute(command: UploadProductImageCommand): Promise<ProductModel> {
    // La imagen se valida antes de tocar el almacenamiento.
    const image = ProductImage.of(command.content, command.contentType);
    const current = await this.repository.findById(command.productId);
    if (current === null) {
      throw ProductNotFoundException.becauseIdDoesNotExist(command.productId);
    }
    const imageKey = await this.imageStorage.upload(current.id, image);
    const now = new Date();
    const updated = current.withImage(imageKey, now);
    await this.repository.save(updated);
    await this.cache.evict(updated.id);
    await this.publisher.publish(new ProductUpdatedDomainEvent(updated, now));
    return updated;
  }
}
