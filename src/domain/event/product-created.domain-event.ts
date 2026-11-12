import type { ProductModel } from '../model/product.model';
import { DomainEvent, type EventValue } from './domain-event';
import { productSnapshot } from './product-snapshot';

/** Se publica en `product-events` cuando se crea un producto. */
export class ProductCreatedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'product.created';

  constructor(
    readonly product: ProductModel,
    occurredOn: Date,
  ) {
    super(ProductCreatedDomainEvent.EVENT_NAME, occurredOn);
  }

  aggregateId(): string {
    return this.product.id;
  }

  payload(): Readonly<Record<string, EventValue>> {
    return productSnapshot(this.product);
  }
}
