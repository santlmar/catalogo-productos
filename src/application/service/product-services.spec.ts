import { ProductCreatedDomainEvent } from '../../domain/event/product-created.domain-event';
import { ProductDeletedDomainEvent } from '../../domain/event/product-deleted.domain-event';
import { ProductUpdatedDomainEvent } from '../../domain/event/product-updated.domain-event';
import { InvalidPriceException } from '../../domain/exception/invalid-price.exception';
import { InvalidProductImageException } from '../../domain/exception/invalid-product-image.exception';
import { ProductImageNotFoundException } from '../../domain/exception/product-image-not-found.exception';
import { ProductNotFoundException } from '../../domain/exception/product-not-found.exception';
import { ProductModel } from '../../domain/model/product.model';
import { Price } from '../../domain/valueobject/price';
import type { ProductImage } from '../../domain/valueobject/product-image';
import type { DomainEvent } from '../../domain/event/domain-event';
import type { ProductCachePort } from '../port/out/product-cache.port';
import type { ProductEventPublisherPort } from '../port/out/product-event-publisher.port';
import type {
  ProductImageStoragePort,
  SignedImageUrl,
} from '../port/out/product-image-storage.port';
import type { ProductRepositoryPort } from '../port/out/product-repository.port';
import { CreateProductService } from './create-product.service';
import { DeleteProductService } from './delete-product.service';
import { CreateProductCommand } from './dto/command/create-product.command';
import { UpdateProductCommand } from './dto/command/update-product.command';
import { UploadProductImageCommand } from './dto/command/upload-product-image.command';
import { GetProductImageUrlService } from './get-product-image-url.service';
import { GetProductService } from './get-product.service';
import { UpdateProductService } from './update-product.service';
import { UploadProductImageService } from './upload-product-image.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const existing = (imageKey: string | null = null): ProductModel =>
  ProductModel.restore({
    id: 'p-1',
    name: 'Camiseta azul',
    description: 'Algodón',
    category: 'ropa',
    price: Price.of(45000),
    imageKey,
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-01T10:00:00.000Z'),
  });

describe('Servicios de producto', () => {
  let repository: {
    save: jest.Mock<Promise<void>, [ProductModel]>;
    findById: jest.Mock<Promise<ProductModel | null>, [string]>;
    delete: jest.Mock<Promise<void>, [string]>;
  };
  let cache: {
    get: jest.Mock<Promise<ProductModel | null>, [string]>;
    put: jest.Mock<Promise<void>, [ProductModel]>;
    evict: jest.Mock<Promise<void>, [string]>;
  };
  let imageStorage: {
    upload: jest.Mock<Promise<string>, [string, ProductImage]>;
    delete: jest.Mock<Promise<void>, [string]>;
    createDownloadUrl: jest.Mock<Promise<SignedImageUrl>, [string]>;
  };
  let publish: jest.Mock<Promise<void>, [DomainEvent]>;
  let publisher: ProductEventPublisherPort;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(existing()),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    cache = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      evict: jest.fn().mockResolvedValue(undefined),
    };
    imageStorage = {
      upload: jest.fn().mockResolvedValue('images/p-1'),
      delete: jest.fn().mockResolvedValue(undefined),
      createDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://b2.example/images/p-1?firma',
        expiresInSeconds: 900,
      }),
    };
    publish = jest.fn().mockResolvedValue(undefined);
    publisher = { publish };
  });

  const asRepository = (): ProductRepositoryPort => repository;
  const asCache = (): ProductCachePort => cache;
  const asStorage = (): ProductImageStoragePort => imageStorage;

  describe('CreateProductService', () => {
    it('debe guardar el producto con un id UUID y publicar product.created', async () => {
      // Act
      const product = await new CreateProductService(
        asRepository(),
        publisher,
      ).execute(
        new CreateProductCommand('Camiseta azul', 'Algodón', 'Ropa', 45000),
      );

      // Assert
      expect(product.id).toMatch(UUID_PATTERN);
      expect(product.category).toBe('ropa');
      expect(repository.save).toHaveBeenCalledWith(product);
      const event = publish.mock.calls[0][0];
      expect(event).toBeInstanceOf(ProductCreatedDomainEvent);
      expect(event.payload()).toMatchObject({
        id: product.id,
        price: 45000,
        hasImage: false,
      });
    });

    it('no debe guardar ni publicar si el precio es inválido', async () => {
      // Act
      const act = new CreateProductService(asRepository(), publisher).execute(
        new CreateProductCommand('Camiseta', '', 'ropa', -1),
      );

      // Assert
      await expect(act).rejects.toBeInstanceOf(InvalidPriceException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('GetProductService', () => {
    it('debe responder desde la caché sin tocar el bucket (HIT)', async () => {
      // Arrange
      cache.get.mockResolvedValue(existing());

      // Act
      const result = await new GetProductService(
        asRepository(),
        asCache(),
      ).execute('p-1');

      // Assert
      expect(result.source).toBe('cache');
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('debe leer del bucket y guardar en caché cuando no está (MISS)', async () => {
      // Act
      const result = await new GetProductService(
        asRepository(),
        asCache(),
      ).execute('p-1');

      // Assert
      expect(result.source).toBe('storage');
      expect(repository.findById).toHaveBeenCalledWith('p-1');
      expect(cache.put).toHaveBeenCalledWith(result.product);
    });

    it('debe lanzar ProductNotFoundException si no existe', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        new GetProductService(asRepository(), asCache()).execute('nope'),
      ).rejects.toBeInstanceOf(ProductNotFoundException);
      expect(cache.put).not.toHaveBeenCalled();
    });
  });

  describe('UpdateProductService', () => {
    const command = new UpdateProductCommand(
      'p-1',
      'Camiseta roja',
      'Algodón',
      'ropa',
      50000,
    );

    it('debe guardar, invalidar la caché y publicar product.updated', async () => {
      // Act
      const updated = await new UpdateProductService(
        asRepository(),
        asCache(),
        publisher,
      ).execute(command);

      // Assert
      expect(updated).toMatchObject({ id: 'p-1', name: 'Camiseta roja' });
      expect(updated.price.value).toBe(50000);
      expect(repository.save).toHaveBeenCalledWith(updated);
      expect(cache.evict).toHaveBeenCalledWith('p-1');
      expect(publish.mock.calls[0][0]).toBeInstanceOf(
        ProductUpdatedDomainEvent,
      );
    });

    it('debe leer de la fuente de verdad y no de la caché', async () => {
      // Act
      await new UpdateProductService(
        asRepository(),
        asCache(),
        publisher,
      ).execute(command);

      // Assert
      expect(cache.get).not.toHaveBeenCalled();
      expect(repository.findById).toHaveBeenCalledWith('p-1');
    });

    it('debe lanzar ProductNotFoundException si no existe', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        new UpdateProductService(asRepository(), asCache(), publisher).execute(
          command,
        ),
      ).rejects.toBeInstanceOf(ProductNotFoundException);
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('DeleteProductService', () => {
    const service = (): DeleteProductService =>
      new DeleteProductService(
        asRepository(),
        asStorage(),
        asCache(),
        publisher,
      );

    it('debe borrar imagen, producto y caché, y publicar product.deleted', async () => {
      // Arrange
      repository.findById.mockResolvedValue(existing('images/p-1'));

      // Act
      await service().execute('p-1');

      // Assert
      expect(imageStorage.delete).toHaveBeenCalledWith('images/p-1');
      expect(repository.delete).toHaveBeenCalledWith('p-1');
      expect(cache.evict).toHaveBeenCalledWith('p-1');
      const event = publish.mock.calls[0][0];
      expect(event).toBeInstanceOf(ProductDeletedDomainEvent);
      expect(event.payload()).toEqual({ id: 'p-1' });
    });

    it('no debe intentar borrar imagen si el producto no tiene', async () => {
      await service().execute('p-1');

      expect(imageStorage.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar ProductNotFoundException si no existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service().execute('nope')).rejects.toBeInstanceOf(
        ProductNotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('UploadProductImageService', () => {
    const service = (): UploadProductImageService =>
      new UploadProductImageService(
        asRepository(),
        asStorage(),
        asCache(),
        publisher,
      );

    it('debe subir al bucket, asociar la clave y publicar product.updated con hasImage', async () => {
      // Act
      const updated = await service().execute(
        new UploadProductImageCommand(
          'p-1',
          new Uint8Array([1, 2, 3]),
          'image/png',
        ),
      );

      // Assert
      expect(imageStorage.upload).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ contentType: 'image/png' }),
      );
      expect(updated.imageKey).toBe('images/p-1');
      expect(repository.save).toHaveBeenCalledWith(updated);
      expect(cache.evict).toHaveBeenCalledWith('p-1');
      expect(publish.mock.calls[0][0].payload()).toMatchObject({
        hasImage: true,
      });
    });

    it('debe rechazar un tipo de archivo inválido sin tocar el bucket', async () => {
      // Act
      const act = service().execute(
        new UploadProductImageCommand(
          'p-1',
          new Uint8Array([1]),
          'application/pdf',
        ),
      );

      // Assert
      await expect(act).rejects.toBeInstanceOf(InvalidProductImageException);
      expect(imageStorage.upload).not.toHaveBeenCalled();
    });

    it('debe lanzar ProductNotFoundException sin subir nada si el producto no existe', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service().execute(
          new UploadProductImageCommand(
            'nope',
            new Uint8Array([1]),
            'image/png',
          ),
        ),
      ).rejects.toBeInstanceOf(ProductNotFoundException);
      expect(imageStorage.upload).not.toHaveBeenCalled();
    });
  });

  describe('GetProductImageUrlService', () => {
    const service = (): GetProductImageUrlService =>
      new GetProductImageUrlService(
        new GetProductService(asRepository(), asCache()),
        asStorage(),
      );

    it('debe devolver una URL firmada para la imagen del producto', async () => {
      // Arrange
      repository.findById.mockResolvedValue(existing('images/p-1'));

      // Act
      const result = await service().execute('p-1');

      // Assert
      expect(imageStorage.createDownloadUrl).toHaveBeenCalledWith('images/p-1');
      expect(result).toEqual({
        productId: 'p-1',
        url: 'https://b2.example/images/p-1?firma',
        expiresInSeconds: 900,
      });
    });

    it('debe lanzar ProductImageNotFoundException si el producto no tiene imagen', async () => {
      await expect(service().execute('p-1')).rejects.toBeInstanceOf(
        ProductImageNotFoundException,
      );
      expect(imageStorage.createDownloadUrl).not.toHaveBeenCalled();
    });
  });
});
