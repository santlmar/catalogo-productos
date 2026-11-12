import { Logger } from '@nestjs/common';
import type { ProductEventPublisherPort } from '../../../application/port/out/product-event-publisher.port';
import type { DomainEvent } from '../../../domain/event/domain-event';
import { EventMessageMapper } from './mapper/event-message.mapper';

/** Adaptador de desarrollo (`KAFKA_ENABLED=false`): registra el mensaje que se habría publicado. */
export class LogProductEventPublisherAdapter implements ProductEventPublisherPort {
  private readonly logger = new Logger(LogProductEventPublisherAdapter.name);

  publish(event: DomainEvent): Promise<void> {
    this.logger.log(
      `Evento simulado (no publicado): ${JSON.stringify(EventMessageMapper.toMessage(event))}`,
    );
    return Promise.resolve();
  }
}
