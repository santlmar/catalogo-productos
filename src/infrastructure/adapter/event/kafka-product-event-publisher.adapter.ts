import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { Producer } from 'kafkajs';
import type { ProductEventPublisherPort } from '../../../application/port/out/product-event-publisher.port';
import type { DomainEvent } from '../../../domain/event/domain-event';
import type { KafkaClient } from '../../config/kafka.config';
import { EventMessageMapper } from './mapper/event-message.mapper';

/**
 * Publica los eventos de producto en Kafka (Aiven). La key del mensaje es el id
 * del producto: todos sus eventos caen en la misma partición y llegan en orden.
 */
export class KafkaProductEventPublisherAdapter
  implements ProductEventPublisherPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaProductEventPublisherAdapter.name);
  private readonly producer: Producer;

  constructor(
    kafka: KafkaClient,
    private readonly topic: string,
  ) {
    this.producer = kafka.producer({ allowAutoTopicCreation: false });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log(`Producer conectado. topic=${this.topic}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(event: DomainEvent): Promise<void> {
    const productId = event.aggregateId();
    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: productId,
            value: JSON.stringify(EventMessageMapper.toMessage(event)),
          },
        ],
      });
      this.logger.log(
        `Evento publicado. evento=${event.eventName} id=${productId}`,
      );
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Evento NO publicado. evento=${event.eventName} id=${productId} causa=${cause}`,
      );
    }
  }
}
