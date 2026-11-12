import { Module } from '@nestjs/common';
import { CREATE_PRODUCT_USE_CASE } from '../../application/port/in/create-product.use-case';
import { DELETE_PRODUCT_USE_CASE } from '../../application/port/in/delete-product.use-case';
import { GET_PRODUCT_IMAGE_URL_USE_CASE } from '../../application/port/in/get-product-image-url.use-case';
import { GET_PRODUCT_USE_CASE } from '../../application/port/in/get-product.use-case';
import { UPDATE_PRODUCT_USE_CASE } from '../../application/port/in/update-product.use-case';
import { UPLOAD_PRODUCT_IMAGE_USE_CASE } from '../../application/port/in/upload-product-image.use-case';
import {
  PRODUCT_CACHE_PORT,
  type ProductCachePort,
} from '../../application/port/out/product-cache.port';
import {
  PRODUCT_EVENT_PUBLISHER_PORT,
  type ProductEventPublisherPort,
} from '../../application/port/out/product-event-publisher.port';
import {
  PRODUCT_IMAGE_STORAGE_PORT,
  type ProductImageStoragePort,
} from '../../application/port/out/product-image-storage.port';
import {
  PRODUCT_REPOSITORY_PORT,
  type ProductRepositoryPort,
} from '../../application/port/out/product-repository.port';
import { CreateProductService } from '../../application/service/create-product.service';
import { DeleteProductService } from '../../application/service/delete-product.service';
import { GetProductImageUrlService } from '../../application/service/get-product-image-url.service';
import { GetProductService } from '../../application/service/get-product.service';
import { UpdateProductService } from '../../application/service/update-product.service';
import { UploadProductImageService } from '../../application/service/upload-product-image.service';
import { InMemoryProductCacheAdapter } from '../adapter/cache/in-memory-product-cache.adapter';
import { ValkeyProductCacheAdapter } from '../adapter/cache/valkey-product-cache.adapter';
import { KafkaProductEventPublisherAdapter } from '../adapter/event/kafka-product-event-publisher.adapter';
import { LogProductEventPublisherAdapter } from '../adapter/event/log-product-event-publisher.adapter';
import { B2ProductImageStorageAdapter } from '../adapter/storage/b2-product-image-storage.adapter';
import { B2ProductRepositoryAdapter } from '../adapter/storage/b2-product-repository.adapter';
import { InMemoryProductImageStorageAdapter } from '../adapter/storage/in-memory-product-image-storage.adapter';
import { InMemoryProductRepositoryAdapter } from '../adapter/storage/in-memory-product-repository.adapter';
import { CACHE_CONFIG, type CacheConfig } from './cache.config';
import {
  KAFKA_CLIENT,
  KAFKA_CONFIG,
  type KafkaClient,
  type KafkaConfig,
} from './kafka.config';
import { KafkaModule } from './kafka.module';
import {
  S3_CLIENT,
  STORAGE_CONFIG,
  type ObjectStorageClient,
  type StorageConfig,
} from './storage.config';
import { StorageModule } from './storage.module';
import { createValkeyClient } from './valkey.client';

/** Selecciona dónde se guardan los productos según `STORAGE_PROVIDER`. */
export function createProductRepository(
  config: StorageConfig,
  s3: ObjectStorageClient,
): ProductRepositoryPort {
  switch (config.provider) {
    case 'b2':
      return new B2ProductRepositoryAdapter(s3, config.b2.bucket);
    case 'memory':
      return new InMemoryProductRepositoryAdapter();
  }
}

/** Selecciona dónde se guardan las imágenes según `STORAGE_PROVIDER`. */
export function createProductImageStorage(
  config: StorageConfig,
  s3: ObjectStorageClient,
): ProductImageStoragePort {
  switch (config.provider) {
    case 'b2':
      return new B2ProductImageStorageAdapter(
        s3,
        config.b2.bucket,
        config.b2.signedUrlTtlSeconds,
      );
    case 'memory':
      return new InMemoryProductImageStorageAdapter(
        config.b2.signedUrlTtlSeconds,
      );
  }
}

/** Selecciona la caché según `CACHE_PROVIDER`. */
export function createProductCache(config: CacheConfig): ProductCachePort {
  switch (config.provider) {
    case 'valkey':
      return new ValkeyProductCacheAdapter(
        createValkeyClient(config),
        config.ttlSeconds,
      );
    case 'memory':
      return new InMemoryProductCacheAdapter(config.ttlSeconds);
  }
}

/** Con `KAFKA_ENABLED=false` los eventos solo se registran en el log. */
export function createProductEventPublisher(
  config: KafkaConfig,
  kafka: KafkaClient,
): ProductEventPublisherPort {
  return config.enabled
    ? new KafkaProductEventPublisherAdapter(kafka, config.productEventsTopic)
    : new LogProductEventPublisherAdapter();
}

/**
 * Composition root de la aplicación: aquí (y solo aquí) se enlazan los puertos
 * con sus adaptadores y los casos de uso con sus servicios.
 */
@Module({
  imports: [StorageModule, KafkaModule],
  providers: [
    {
      provide: PRODUCT_REPOSITORY_PORT,
      inject: [STORAGE_CONFIG, S3_CLIENT],
      useFactory: createProductRepository,
    },
    {
      provide: PRODUCT_IMAGE_STORAGE_PORT,
      inject: [STORAGE_CONFIG, S3_CLIENT],
      useFactory: createProductImageStorage,
    },
    {
      provide: PRODUCT_CACHE_PORT,
      inject: [CACHE_CONFIG],
      useFactory: createProductCache,
    },
    {
      provide: PRODUCT_EVENT_PUBLISHER_PORT,
      inject: [KAFKA_CONFIG, KAFKA_CLIENT],
      useFactory: createProductEventPublisher,
    },
    { provide: CREATE_PRODUCT_USE_CASE, useClass: CreateProductService },
    { provide: GET_PRODUCT_USE_CASE, useClass: GetProductService },
    { provide: UPDATE_PRODUCT_USE_CASE, useClass: UpdateProductService },
    { provide: DELETE_PRODUCT_USE_CASE, useClass: DeleteProductService },
    {
      provide: UPLOAD_PRODUCT_IMAGE_USE_CASE,
      useClass: UploadProductImageService,
    },
    {
      provide: GET_PRODUCT_IMAGE_URL_USE_CASE,
      useClass: GetProductImageUrlService,
    },
  ],
  exports: [
    CREATE_PRODUCT_USE_CASE,
    GET_PRODUCT_USE_CASE,
    UPDATE_PRODUCT_USE_CASE,
    DELETE_PRODUCT_USE_CASE,
    UPLOAD_PRODUCT_IMAGE_USE_CASE,
    GET_PRODUCT_IMAGE_URL_USE_CASE,
  ],
})
export class ProductModule {}
