import { Logger } from '@nestjs/common';
import { ProductCreatedDomainEvent } from '../../../domain/event/product-created.domain-event';
import { ProductDeletedDomainEvent } from '../../../domain/event/product-deleted.domain-event';
import { ProductModel } from '../../../domain/model/product.model';
import { Price } from '../../../domain/valueobject/price';
import type { KafkaClient } from '../../config/kafka.config';
import { KafkaProductEventPublisherAdapter } from './kafka-product-event-publisher.adapter';

const occurredOn = new Date('2026-11-12T15:00:00.000Z');
const product = ProductModel.create(
  'p-1',
  {
    name: 'Camiseta azul',
    description: 'Algodón',
    category: 'Ropa',
    price: Price.of(45000),
  },
  occurredOn,
);

describe('KafkaProductEventPublisherAdapter', () => {
  let send: jest.Mock;
  let producerOptions: unknown;
  let adapter: KafkaProductEventPublisherAdapter;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    send = jest.fn().mockResolvedValue([]);
    const kafka = {
      producer: (options: unknown) => {
        producerOptions = options;
        return { send, connect: jest.fn(), disconnect: jest.fn() };
      },
    } as unknown as KafkaClient;
    adapter = new KafkaProductEventPublisherAdapter(kafka, 'product-events');
  });

  afterEach(() => jest.restoreAllMocks());

  it('no debe crear tópicos automáticamente (en Aiven se crean desde la consola)', () => {
    expect(producerOptions).toEqual({ allowAutoTopicCreation: false });
  });

  it('debe publicar el sobre JSON con el id del producto como key', async () => {
    // Act
    await adapter.publish(new ProductCreatedDomainEvent(product, occurredOn));

    // Assert
    const record = send.mock.calls[0][0];
    expect(record.topic).toBe('product-events');
    expect(record.messages[0].key).toBe('p-1');
    expect(JSON.parse(record.messages[0].value)).toEqual({
      eventName: 'product.created',
      occurredOn: '2026-11-12T15:00:00.000Z',
      payload: {
        id: 'p-1',
        name: 'Camiseta azul',
        description: 'Algodón',
        category: 'ropa',
        price: 45000,
        hasImage: false,
        updatedAt: '2026-11-12T15:00:00.000Z',
      },
    });
  });

  it('debe publicar product.deleted solo con el id', async () => {
    await adapter.publish(new ProductDeletedDomainEvent('p-1', occurredOn));

    const message = JSON.parse(send.mock.calls[0][0].messages[0].value);
    expect(message).toMatchObject({
      eventName: 'product.deleted',
      payload: { id: 'p-1' },
    });
  });

  it('no debe lanzar si Kafka falla: registra el error y la operación continúa', async () => {
    // Arrange
    send.mockRejectedValue(new Error('broker caído'));
    const error = jest.spyOn(Logger.prototype, 'error');

    // Act & Assert
    await expect(
      adapter.publish(new ProductCreatedDomainEvent(product, occurredOn)),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('NO publicado'));
  });
});
