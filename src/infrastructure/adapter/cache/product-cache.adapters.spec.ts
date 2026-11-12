import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { ProductModel } from '../../../domain/model/product.model';
import { Price } from '../../../domain/valueobject/price';
import { ProductPersistenceMapper } from '../mapper/product-persistence.mapper';
import { InMemoryProductCacheAdapter } from './in-memory-product-cache.adapter';
import { ValkeyProductCacheAdapter } from './valkey-product-cache.adapter';

const product = ProductModel.restore({
  id: 'p-1',
  name: 'Camiseta azul',
  description: 'Algodón',
  category: 'ropa',
  price: Price.of(45000),
  imageKey: 'images/p-1',
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  updatedAt: new Date('2026-11-01T10:00:00.000Z'),
});

describe('ValkeyProductCacheAdapter', () => {
  let client: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    quit: jest.Mock;
  };
  let adapter: ValkeyProductCacheAdapter;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    client = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    adapter = new ValkeyProductCacheAdapter(client as unknown as Redis, 300);
  });

  afterEach(() => jest.restoreAllMocks());

  it('put debe guardar un String JSON en producto:<id> con TTL (SET ... EX 300)', async () => {
    // Act
    await adapter.put(product);

    // Assert
    expect(client.set).toHaveBeenCalledWith(
      'producto:p-1',
      ProductPersistenceMapper.toJson(product),
      'EX',
      300,
    );
  });

  it('get debe reconstruir el producto en un HIT', async () => {
    // Arrange
    client.get.mockResolvedValue(ProductPersistenceMapper.toJson(product));

    // Act & Assert
    await expect(adapter.get('p-1')).resolves.toEqual(product);
    expect(client.get).toHaveBeenCalledWith('producto:p-1');
  });

  it('get debe devolver null en un MISS', async () => {
    await expect(adapter.get('p-1')).resolves.toBeNull();
  });

  it('evict debe borrar la clave', async () => {
    await adapter.evict('p-1');

    expect(client.del).toHaveBeenCalledWith('producto:p-1');
  });

  it('nunca debe lanzar si Valkey no responde (se comporta como MISS)', async () => {
    // Arrange
    const failure = new Error('Command timed out');
    client.get.mockRejectedValue(failure);
    client.set.mockRejectedValue(failure);
    client.del.mockRejectedValue(failure);

    // Act & Assert
    await expect(adapter.get('p-1')).resolves.toBeNull();
    await expect(adapter.put(product)).resolves.toBeUndefined();
    await expect(adapter.evict('p-1')).resolves.toBeUndefined();
  });

  it('debe descartar una entrada corrupta', async () => {
    // Arrange
    client.get.mockResolvedValue('{roto');

    // Act & Assert
    await expect(adapter.get('p-1')).resolves.toBeNull();
    expect(client.del).toHaveBeenCalledWith('producto:p-1');
  });
});

describe('InMemoryProductCacheAdapter', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'log').mockImplementation());
  afterEach(() => jest.restoreAllMocks());

  it('debe expirar las entradas al cumplirse el TTL', async () => {
    // Arrange
    let now = 0;
    const cache = new InMemoryProductCacheAdapter(300, () => now);
    await cache.put(product);

    // Act & Assert
    now = 299_999;
    await expect(cache.get('p-1')).resolves.toEqual(product);
    now = 300_000;
    await expect(cache.get('p-1')).resolves.toBeNull();
  });
});
