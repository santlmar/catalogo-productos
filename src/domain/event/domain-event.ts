export type EventValue = string | number | boolean;

export abstract class DomainEvent {
  protected constructor(
    readonly eventName: string,
    readonly occurredOn: Date,
  ) {}

  /** Identificador del agregado: se usa como key del mensaje para conservar el orden por producto. */
  abstract aggregateId(): string;

  /** Representación plana del evento, idéntica al `payload` del mensaje en el tópico. */
  abstract payload(): Readonly<Record<string, EventValue>>;
}
