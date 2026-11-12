import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FileStorageException } from '../../../domain/exception/file-storage.exception';
import { ProductModel } from '../../../domain/model/product.model';
import { Price } from '../../../domain/valueobject/price';
import { ProductImage } from '../../../domain/valueobject/product-image';
import { B2ProductImageStorageAdapter } from './b2-product-image-storage.adapter';
import { B2ProductRepositoryAdapter } from './b2-product-repository.adapter';

const product = ProductModel.restore({
  id: 'p-1',
  name: 'Camiseta azul',
  description: 'Algodón',
  category: 'ropa',
  price: Price.of(45000),
  imageKey: null,
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  updatedAt: new Date('2026-11-01T10:00:00.000Z'),
});

const notFound = Object.assign(new Error('The specified key does not exist.'), {
  name: 'NoSuchKey',
  $metadata: { httpStatusCode: 404 },
});

describe('B2ProductRepositoryAdapter', () => {
  let send: jest.Mock;
  let adapter: B2ProductRepositoryAdapter;

  beforeEach(() => {
    send = jest.fn().mockResolvedValue({});
    adapter = new B2ProductRepositoryAdapter(
      { send } as unknown as S3Client,
      'catalogo',
    );
  });

  it('save debe escribir products/<id>.json en el bucket', async () => {
    // Act
    await adapter.save(product);

    // Assert
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'catalogo',
      Key: 'products/p-1.json',
      ContentType: 'application/json',
    });
    expect(JSON.parse(command.input.Body as string)).toMatchObject({
      id: 'p-1',
      price: 45000,
    });
  });

  it('findById debe reconstruir el producto desde el JSON del bucket', async () => {
    // Arrange
    let stored = '';
    send.mockImplementationOnce((command: PutObjectCommand) => {
      stored = command.input.Body as string;
      return Promise.resolve({});
    });
    await adapter.save(product);
    send.mockResolvedValueOnce({
      Body: { transformToString: () => Promise.resolve(stored) },
    });

    // Act
    const found = await adapter.findById('p-1');

    // Assert
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
    expect(found).toEqual(product);
  });

  it('findById debe devolver null si el objeto no existe (NoSuchKey)', async () => {
    send.mockRejectedValue(notFound);

    await expect(adapter.findById('p-404')).resolves.toBeNull();
  });

  it('findById debe lanzar FileStorageException si el JSON está corrupto', async () => {
    send.mockResolvedValue({
      Body: { transformToString: () => Promise.resolve('{roto') },
    });

    await expect(adapter.findById('p-1')).rejects.toThrow(/products\/p-1.json/);
  });

  it('debe envolver los errores de red en FileStorageException', async () => {
    send.mockRejectedValue(new Error('ECONNRESET'));

    await expect(adapter.save(product)).rejects.toBeInstanceOf(
      FileStorageException,
    );
    await expect(adapter.findById('p-1')).rejects.toBeInstanceOf(
      FileStorageException,
    );
    await expect(adapter.delete('p-1')).rejects.toBeInstanceOf(
      FileStorageException,
    );
  });

  it('delete debe borrar products/<id>.json', async () => {
    await adapter.delete('p-1');

    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'catalogo',
      Key: 'products/p-1.json',
    });
  });
});

describe('B2ProductImageStorageAdapter', () => {
  it('upload debe subir a images/<id> con su content-type y devolver la clave', async () => {
    // Arrange
    const send = jest.fn().mockResolvedValue({});
    const adapter = new B2ProductImageStorageAdapter(
      { send } as unknown as S3Client,
      'catalogo',
      900,
    );
    const image = ProductImage.of(new Uint8Array([1, 2, 3]), 'image/png');

    // Act
    const key = await adapter.upload('p-1', image);

    // Assert
    expect(key).toBe('images/p-1');
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'catalogo',
      Key: 'images/p-1',
      ContentType: 'image/png',
      ContentLength: 3,
    });
  });

  it('createDownloadUrl debe firmar localmente una URL GET temporal (sin llamar a B2)', async () => {
    // Arrange
    const client = new S3Client({
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      credentials: { accessKeyId: '005abc', secretAccessKey: 'K005secret' },
      forcePathStyle: true,
    });
    const adapter = new B2ProductImageStorageAdapter(client, 'catalogo', 600);

    // Act
    const signed = await adapter.createDownloadUrl('images/p-1');

    // Assert
    const url = new URL(signed.url);
    expect(url.origin).toBe('https://s3.us-east-005.backblazeb2.com');
    expect(url.pathname).toBe('/catalogo/images/p-1');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.url).not.toContain('K005secret');
    expect(signed.expiresInSeconds).toBe(600);
  });
});
