import { DomainEvent, type EventValue } from './domain-event';

/** Se publica en `product-events` cuando se elimina un producto. */
export class ProductDeletedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'product.deleted';

  constructor(
    readonly productId: string,
    occurredOn: Date,
  ) {
    super(ProductDeletedDomainEvent.EVENT_NAME, occurredOn);
  }

  aggregateId(): string {
    return this.productId;
  }

  payload(): Readonly<Record<string, EventValue>> {
    return { id: this.productId };
  }
}
