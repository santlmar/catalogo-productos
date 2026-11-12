import type { ProductModel } from '../model/product.model';
import { DomainEvent, type EventValue } from './domain-event';
import { productSnapshot } from './product-snapshot';

/** Se publica en `product-events` cuando cambian los datos o la imagen de un producto. */
export class ProductUpdatedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'product.updated';

  constructor(
    readonly product: ProductModel,
    occurredOn: Date,
  ) {
    super(ProductUpdatedDomainEvent.EVENT_NAME, occurredOn);
  }

  aggregateId(): string {
    return this.product.id;
  }

  payload(): Readonly<Record<string, EventValue>> {
    return productSnapshot(this.product);
  }
}
