export const CACHE_CONFIG = Symbol('CacheConfig');

/** `valkey`: Valkey de Aiven (Guía 10). `memory`: solo para desarrollo local. */
export type CacheProvider = 'valkey' | 'memory';

export interface CacheConfig {
  readonly provider: CacheProvider;
  /** Service URI de Aiven: `rediss://default:<password>@<host>:<port>` (TLS). */
  readonly url: string;
  /** Tiempo de vida de cada producto en caché. */
  readonly ttlSeconds: number;
  /** Si Valkey tarda más que esto, la consulta se trata como fallo de caché. */
  readonly commandTimeoutMs: number;
}
