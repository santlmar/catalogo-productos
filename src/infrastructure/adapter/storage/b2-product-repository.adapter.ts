import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { ProductRepositoryPort } from '../../../application/port/out/product-repository.port';
import { FileStorageException } from '../../../domain/exception/file-storage.exception';
import type { ProductModel } from '../../../domain/model/product.model';
import type { ObjectStorageClient } from '../../config/storage.config';
import { ProductPersistenceMapper } from '../mapper/product-persistence.mapper';
import { isObjectNotFound } from './s3-error.util';

const PRODUCTS_PREFIX = 'products/';

/**
 * Guía 9: el mismo bucket privado de Backblaze B2 guarda cada producto como un
 * objeto JSON (`products/<id>.json`). Es la fuente de verdad del catálogo.
 */
export class B2ProductRepositoryAdapter implements ProductRepositoryPort {
  constructor(
    private readonly s3: ObjectStorageClient,
    private readonly bucket: string,
  ) {}

  async save(product: ProductModel): Promise<void> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.keyOf(product.id),
          Body: ProductPersistenceMapper.toJson(product),
          ContentType: 'application/json',
        }),
      );
    } catch (error) {
      throw FileStorageException.becauseOperationFailed(
        'guardar producto',
        error,
      );
    }
  }

  async findById(productId: string): Promise<ProductModel | null> {
    const key = this.keyOf(productId);
    let raw: string;
    try {
      const output = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      raw = (await output.Body?.transformToString('utf-8')) ?? '';
    } catch (error) {
      if (isObjectNotFound(error)) {
        return null;
      }
      throw FileStorageException.becauseOperationFailed(
        'consultar producto',
        error,
      );
    }
    try {
      return ProductPersistenceMapper.fromJson(raw);
    } catch {
      throw FileStorageException.becauseStoredDataIsCorrupt(key);
    }
  }

  async delete(productId: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.keyOf(productId),
        }),
      );
    } catch (error) {
      throw FileStorageException.becauseOperationFailed(
        'eliminar producto',
        error,
      );
    }
  }

  private keyOf(productId: string): string {
    return `${PRODUCTS_PREFIX}${productId}.json`;
  }
}
