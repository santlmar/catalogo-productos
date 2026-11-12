import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import type { CacheConfig } from './cache.config';

/**
 * Guía 10: conexión al Service URI de Aiven. El prefijo `rediss://` activa TLS.
 * Se limita el tiempo de cada comando para que una caché lenta no frene las consultas.
 */
export function createValkeyClient(config: CacheConfig): Redis {
  const logger = new Logger('ValkeyClient');
  const client = new Redis(config.url, {
    commandTimeout: config.commandTimeoutMs,
    maxRetriesPerRequest: 1,
    // Sin conexión, los comandos fallan al instante (MISS) en vez de quedar en cola.
    enableOfflineQueue: false,
    connectionName: 'product-service',
  });
  let lastError = '';
  client.on('ready', () => {
    lastError = '';
    logger.log('Conectado a Valkey.');
  });
  // Sin este listener ioredis imprime "Unhandled error event" en cada reintento.
  client.on('error', (error: Error) => {
    if (error.message !== lastError) {
      lastError = error.message;
      logger.warn(
        `Valkey no disponible, se reintentará la conexión. causa=${error.message}`,
      );
    }
  });
  return client;
}
