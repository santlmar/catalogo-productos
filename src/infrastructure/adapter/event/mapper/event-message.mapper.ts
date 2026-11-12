import type { DomainEvent } from '../../../../domain/event/domain-event';
import type { DomainEventMessage } from '../dto/domain-event.message';

export class EventMessageMapper {
  private constructor() {}

  static toMessage(event: DomainEvent): DomainEventMessage {
    return {
      eventName: event.eventName,
      occurredOn: event.occurredOn.toISOString(),
      payload: event.payload(),
    };
  }
}
