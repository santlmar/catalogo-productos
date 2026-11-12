import type { S3Client } from '@aws-sdk/client-s3';

export const STORAGE_CONFIG = Symbol('StorageConfig');
export const S3_CLIENT = Symbol('S3Client');

/** `b2`: Backblaze B2 vía API S3 (Guía 9). `memory`: solo para desarrollo local. */
export type StorageProvider = 'b2' | 'memory';

export interface B2Config {
  /** Endpoint S3 del bucket, p. ej. `https://s3.us-east-005.backblazeb2.com`. */
  readonly endpoint: string;
  /** Región S3 (`us-east-005`). Si no se indica, se deduce del endpoint. */
  readonly region: string;
  readonly bucket: string;
  /** `keyID` de la Application Key (equivale a `accessKeyId` en S3). */
  readonly keyId: string;
  /** `applicationKey` (equivale a `secretAccessKey` en S3). */
  readonly applicationKey: string;
  /** Vigencia de las URLs firmadas de descarga de imágenes. */
  readonly signedUrlTtlSeconds: number;
}

export interface StorageConfig {
  readonly provider: StorageProvider;
  readonly b2: B2Config;
}

export type ObjectStorageClient = S3Client;
