import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import {
  S3_CLIENT,
  STORAGE_CONFIG,
  type ObjectStorageClient,
  type StorageConfig,
} from './storage.config';

/** Con `STORAGE_PROVIDER=memory` el cliente nunca se usa; solo necesita una región válida. */
const PLACEHOLDER_REGION = 'us-east-005';

/**
 * Guía 9, paso 9.3: cliente del AWS SDK v3 apuntando al endpoint S3 de Backblaze.
 * `keyID` → `accessKeyId` y `applicationKey` → `secretAccessKey`.
 */
export function createS3Client(config: StorageConfig): ObjectStorageClient {
  if (config.provider !== 'b2') {
    return new S3Client({ region: PLACEHOLDER_REGION });
  }
  return new S3Client({
    endpoint: config.b2.endpoint,
    region: config.b2.region,
    credentials: {
      accessKeyId: config.b2.keyId,
      secretAccessKey: config.b2.applicationKey,
    },
    // B2 admite rutas tipo `endpoint/bucket/clave`; evita depender de DNS por bucket.
    forcePathStyle: true,
    // Los checksums CRC automáticos del SDK reciente no son necesarios para B2:
    // solo se envían cuando la operación los exige.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [STORAGE_CONFIG],
      useFactory: createS3Client,
    },
  ],
  exports: [S3_CLIENT],
})
export class StorageModule {}
