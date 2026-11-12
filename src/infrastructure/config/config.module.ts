import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from './app.config';
import { CACHE_CONFIG, type CacheConfig } from './cache.config';
import { ENV, loadEnv, type Env } from './env.validation';
import { KAFKA_CONFIG, type KafkaConfig } from './kafka.config';
import { STORAGE_CONFIG, type StorageConfig } from './storage.config';

/** Expone la configuración validada como providers inyectables en toda la app. */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: (): Env => loadEnv() },
    {
      provide: APP_CONFIG,
      inject: [ENV],
      useFactory: (env: Env): AppConfig => env.app,
    },
    {
      provide: STORAGE_CONFIG,
      inject: [ENV],
      useFactory: (env: Env): StorageConfig => env.storage,
    },
    {
      provide: CACHE_CONFIG,
      inject: [ENV],
      useFactory: (env: Env): CacheConfig => env.cache,
    },
    {
      provide: KAFKA_CONFIG,
      inject: [ENV],
      useFactory: (env: Env): KafkaConfig => env.kafka,
    },
  ],
  exports: [APP_CONFIG, STORAGE_CONFIG, CACHE_CONFIG, KAFKA_CONFIG],
})
export class ConfigModule {}
