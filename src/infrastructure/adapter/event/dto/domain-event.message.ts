import type { EventValue } from '../../../../domain/event/domain-event';

/**
 * Sobre JSON que viaja por el tópico `product-events`:
 * `{ "eventName": "product.created", "occurredOn": "...", "payload": { ... } }`
 */
export interface DomainEventMessage {
  readonly eventName: string;
  readonly occurredOn: string;
  readonly payload: Readonly<Record<string, EventValue>>;
}
