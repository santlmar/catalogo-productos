import type { DomainEvent } from '../../../domain/event/domain-event';

export const PRODUCT_EVENT_PUBLISHER_PORT = Symbol('ProductEventPublisherPort');

export interface ProductEventPublisherPort {
  /**
   * Publica el evento para los demás microservicios (Search Service).
   * Nunca lanza errores: un fallo de publicación se registra y no revierte la
   * operación ya guardada. El índice de búsqueda se corrige con el siguiente cambio
   * del producto (consistencia eventual).
   */
  publish(event: DomainEvent): Promise<void>;
}
