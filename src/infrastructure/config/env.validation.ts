import type { AppConfig } from './app.config';
import type { CacheConfig, CacheProvider } from './cache.config';
import type {
  KafkaConfig,
  KafkaSaslConfig,
  KafkaSaslMechanism,
  KafkaSslConfig,
} from './kafka.config';
import type { StorageConfig, StorageProvider } from './storage.config';

export const ENV = Symbol('Env');

export interface Env {
  readonly app: AppConfig;
  readonly storage: StorageConfig;
  readonly cache: CacheConfig;
  readonly kafka: KafkaConfig;
}

type EnvSource = Readonly<Record<string, string | undefined>>;

const STORAGE_PROVIDERS: readonly StorageProvider[] = ['b2', 'memory'];
const CACHE_PROVIDERS: readonly CacheProvider[] = ['valkey', 'memory'];
const SASL_MECHANISMS: readonly KafkaSaslMechanism[] = [
  'plain',
  'scram-sha-256',
  'scram-sha-512',
];
const SERVICE_NAME = 'product-service';
const DEFAULT_PORT = 3001;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;
/** La Guía 10 usa 300 s (5 min) para la clave de prueba; se reutiliza como TTL por defecto. */
const DEFAULT_CACHE_TTL_SECONDS = 300;
const DEFAULT_CACHE_TIMEOUT_MS = 1000;
/** Los endpoints S3 de B2 tienen la forma `https://s3.<región>.backblazeb2.com`. */
const B2_REGION_PATTERN = /^https?:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/i;

class EnvReader {
  readonly errors: string[] = [];

  constructor(private readonly source: EnvSource) {}

  text(key: string, fallback = ''): string {
    const value = this.source[key]?.trim();
    return value ? value : fallback;
  }

  requiredWhen(condition: boolean, key: string): string {
    const value = this.text(key);
    if (condition && value === '') {
      this.errors.push(`${key} es requerida.`);
    }
    return value;
  }

  integer(key: string, fallback: number): number {
    const raw = this.text(key);
    if (raw === '') {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      this.errors.push(`${key} debe ser un entero positivo.`);
      return fallback;
    }
    return parsed;
  }

  boolean(key: string, fallback: boolean): boolean {
    const raw = this.text(key).toLowerCase();
    if (raw === '') {
      return fallback;
    }
    if (raw !== 'true' && raw !== 'false') {
      this.errors.push(`${key} debe ser "true" o "false".`);
      return fallback;
    }
    return raw === 'true';
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const raw = this.text(key);
    if (raw === '') {
      return fallback;
    }
    const match = allowed.find((option) => option === raw.toLowerCase());
    if (match === undefined) {
      this.errors.push(`${key} debe ser uno de: ${allowed.join(', ')}.`);
      return fallback;
    }
    return match;
  }

  list(key: string): string[] {
    return this.text(key)
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  /** Las variables multilínea (PEM) suelen llegar con `\n` literales. */
  pem(key: string): string | undefined {
    const value = this.text(key);
    return value === '' ? undefined : value.replace(/\\n/g, '\n');
  }

  certificate(key: string): string | undefined {
    const value = this.pem(key);
    if (!value || value.includes('-----BEGIN CERTIFICATE-----')) {
      return value;
    }
    const base64 = value.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      return value;
    }
    const lines = base64.match(/.{1,64}/g)?.join('\n');
    return lines
      ? `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`
      : value;
  }
}

/**
 * Lee y valida las variables de entorno. Si falta o es inválida alguna,
 * lanza un único error con TODOS los problemas para fallar rápido al arrancar.
 */
export function loadEnv(source: EnvSource = process.env): Env {
  const reader = new EnvReader(source);

  const app = readAppConfig(reader);
  const storage = readStorageConfig(reader);
  const cache = readCacheConfig(reader);
  const kafka = readKafkaConfig(reader);

  if (reader.errors.length > 0) {
    const details = reader.errors.map((error) => ` - ${error}`).join('\n');
    throw new Error(`Configuración de entorno inválida:\n${details}`);
  }
  return { app, storage, cache, kafka };
}

function readAppConfig(reader: EnvReader): AppConfig {
  return {
    nodeEnv: reader.text('NODE_ENV', 'development'),
    port: reader.integer('PORT', DEFAULT_PORT),
    serviceName: SERVICE_NAME,
  };
}

function readStorageConfig(reader: EnvReader): StorageConfig {
  const provider = reader.oneOf('STORAGE_PROVIDER', STORAGE_PROVIDERS, 'b2');
  const usesB2 = provider === 'b2';
  const endpoint = reader.requiredWhen(usesB2, 'B2_ENDPOINT');
  if (
    usesB2 &&
    endpoint !== '' &&
    !hasProtocol(endpoint, ['https:', 'http:'])
  ) {
    reader.errors.push('B2_ENDPOINT debe ser una URL http(s) válida.');
  }
  const region = reader.text(
    'B2_REGION',
    B2_REGION_PATTERN.exec(endpoint)?.[1] ?? '',
  );
  if (usesB2 && endpoint !== '' && region === '') {
    reader.errors.push(
      'B2_REGION es requerida cuando no se puede deducir de B2_ENDPOINT.',
    );
  }
  return {
    provider,
    b2: {
      endpoint,
      region,
      bucket: reader.requiredWhen(usesB2, 'B2_BUCKET'),
      keyId: reader.requiredWhen(usesB2, 'B2_KEY_ID'),
      applicationKey: reader.requiredWhen(usesB2, 'B2_APPLICATION_KEY'),
      signedUrlTtlSeconds: reader.integer(
        'B2_SIGNED_URL_TTL_SECONDS',
        DEFAULT_SIGNED_URL_TTL_SECONDS,
      ),
    },
  };
}

function readCacheConfig(reader: EnvReader): CacheConfig {
  const provider = reader.oneOf('CACHE_PROVIDER', CACHE_PROVIDERS, 'valkey');
  return {
    provider,
    url: readValkeyUrl(reader, provider === 'valkey'),
    ttlSeconds: reader.integer('CACHE_TTL_SECONDS', DEFAULT_CACHE_TTL_SECONDS),
    commandTimeoutMs: reader.integer(
      'CACHE_TIMEOUT_MS',
      DEFAULT_CACHE_TIMEOUT_MS,
    ),
  };
}

/** El Service URI de Aiven usa `rediss://` (TLS); `redis://` solo para pruebas locales. */
function readValkeyUrl(reader: EnvReader, required: boolean): string {
  const url = reader.requiredWhen(required, 'VALKEY_URL');
  if (required && url !== '' && !hasProtocol(url, ['rediss:', 'redis:'])) {
    // No se incluye el valor: el Service URI contiene la contraseña.
    reader.errors.push(
      'VALKEY_URL debe empezar por rediss:// (Service URI de Aiven).',
    );
  }
  return url;
}

function hasProtocol(value: string, protocols: readonly string[]): boolean {
  return URL.canParse(value) && protocols.includes(new URL(value).protocol);
}

function readKafkaConfig(reader: EnvReader): KafkaConfig {
  const enabled = reader.boolean('KAFKA_ENABLED', true);
  const brokers = reader.list('KAFKA_BROKERS');
  if (enabled && brokers.length === 0) {
    reader.errors.push(
      'KAFKA_BROKERS es requerida (lista separada por comas).',
    );
  }
  return {
    enabled,
    brokers,
    clientId: reader.text('KAFKA_CLIENT_ID', SERVICE_NAME),
    productEventsTopic: reader.text(
      'KAFKA_TOPIC_PRODUCT_EVENTS',
      'product-events',
    ),
    ssl: readKafkaSsl(reader),
    sasl: readKafkaSasl(reader, enabled),
  };
}

function readKafkaSsl(reader: EnvReader): KafkaSslConfig | undefined {
  if (!reader.boolean('KAFKA_SSL', false)) {
    return undefined;
  }
  return {
    ca: reader.certificate('KAFKA_SSL_CA'),
    cert: reader.pem('KAFKA_SSL_CERT'),
    key: reader.pem('KAFKA_SSL_KEY'),
  };
}

function readKafkaSasl(
  reader: EnvReader,
  enabled: boolean,
): KafkaSaslConfig | undefined {
  const rawMechanism = reader.text('KAFKA_SASL_MECHANISM');
  if (rawMechanism === '') {
    return undefined;
  }
  const mechanism = reader.oneOf(
    'KAFKA_SASL_MECHANISM',
    SASL_MECHANISMS,
    'plain',
  );
  return {
    mechanism,
    username: reader.requiredWhen(enabled, 'KAFKA_USERNAME'),
    password: reader.requiredWhen(enabled, 'KAFKA_PASSWORD'),
  };
}
