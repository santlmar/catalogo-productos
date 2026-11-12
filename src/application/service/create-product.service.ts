import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ProductCreatedDomainEvent } from '../../domain/event/product-created.domain-event';
import { ProductModel } from '../../domain/model/product.model';
import type { CreateProductUseCase } from '../port/in/create-product.use-case';
import {
  PRODUCT_EVENT_PUBLISHER_PORT,
  type ProductEventPublisherPort,
} from '../port/out/product-event-publisher.port';
import {
  PRODUCT_REPOSITORY_PORT,
  type ProductRepositoryPort,
} from '../port/out/product-repository.port';
import type { CreateProductCommand } from './dto/command/create-product.command';
import { ProductApplicationMapper } from './mapper/product-application.mapper';

@Injectable()
export class CreateProductService implements CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly repository: ProductRepositoryPort,
    @Inject(PRODUCT_EVENT_PUBLISHER_PORT)
    private readonly publisher: ProductEventPublisherPort,
  ) {}

  async execute(command: CreateProductCommand): Promise<ProductModel> {
    const now = new Date();
    const product = ProductModel.create(
      randomUUID(),
      ProductApplicationMapper.toDetails(command),
      now,
    );
    await this.repository.save(product);
    await this.publisher.publish(new ProductCreatedDomainEvent(product, now));
    return product;
  }
}
