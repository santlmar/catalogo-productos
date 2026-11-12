import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  ProductImageStoragePort,
  SignedImageUrl,
} from '../../../application/port/out/product-image-storage.port';
import { FileStorageException } from '../../../domain/exception/file-storage.exception';
import type { ProductImage } from '../../../domain/valueobject/product-image';
import type { ObjectStorageClient } from '../../config/storage.config';

const IMAGES_PREFIX = 'images/';

/**
 * Guía 9: imágenes en el bucket privado de Backblaze B2 mediante la API S3.
 * Cada producto tiene una única clave (`images/<id>`); al reemplazar la imagen,
 * B2 conserva la versión anterior hasta que la regla de ciclo de vida la elimina.
 */
export class B2ProductImageStorageAdapter implements ProductImageStoragePort {
  constructor(
    private readonly s3: ObjectStorageClient,
    private readonly bucket: string,
    private readonly signedUrlTtlSeconds: number,
  ) {}

  async upload(productId: string, image: ProductImage): Promise<string> {
    const key = `${IMAGES_PREFIX}${productId}`;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: image.content,
          ContentType: image.contentType,
          ContentLength: image.sizeInBytes,
        }),
      );
    } catch (error) {
      throw FileStorageException.becauseOperationFailed('subir imagen', error);
    }
    return key;
  }

  async delete(imageKey: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: imageKey }),
      );
    } catch (error) {
      throw FileStorageException.becauseOperationFailed(
        'eliminar imagen',
        error,
      );
    }
  }

  /** La firma se calcula localmente con la Application Key: no hace llamadas a B2. */
  async createDownloadUrl(imageKey: string): Promise<SignedImageUrl> {
    try {
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: imageKey }),
        { expiresIn: this.signedUrlTtlSeconds },
      );
      return { url, expiresInSeconds: this.signedUrlTtlSeconds };
    } catch (error) {
      throw FileStorageException.becauseOperationFailed(
        'firmar URL de imagen',
        error,
      );
    }
  }
}
