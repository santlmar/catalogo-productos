import { loadEnv } from './env.validation';

const LOCAL = {
  STORAGE_PROVIDER: 'memory',
  CACHE_PROVIDER: 'memory',
  KAFKA_ENABLED: 'false',
};

describe('loadEnv', () => {
  it('debe cargar una configuración mínima de desarrollo (todo en memoria, Kafka deshabilitado)', () => {
    // Act
    const env = loadEnv(LOCAL);

    // Assert
    expect(env.app).toMatchObject({
      port: 3001,
      serviceName: 'product-service',
    });
    expect(env.storage.provider).toBe('memory');
    expect(env.cache).toMatchObject({ provider: 'memory', ttlSeconds: 300 });
    expect(env.kafka).toMatchObject({
      enabled: false,
      productEventsTopic: 'product-events',
    });
  });

  it('debe ignorar las variables de B2 y Valkey si el proveedor es memory', () => {
    expect(() =>
      loadEnv({ ...LOCAL, B2_ENDPOINT: 'pendiente', VALKEY_URL: 'pendiente' }),
    ).not.toThrow();
  });

  it('debe reportar TODAS las variables faltantes en un único error', () => {
    // Act
    const act = (): unknown => loadEnv({});

    // Assert
    expect(act).toThrow(
      /B2_ENDPOINT[\s\S]*B2_BUCKET[\s\S]*B2_KEY_ID[\s\S]*B2_APPLICATION_KEY[\s\S]*VALKEY_URL[\s\S]*KAFKA_BROKERS/,
    );
  });

  it('debe cargar una configuración completa de producción (B2 + Aiven)', () => {
    // Act
    const env = loadEnv({
      NODE_ENV: 'production',
      PORT: '10000',
      B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
      B2_BUCKET: 'catalogo-productos-dev-2026',
      B2_KEY_ID: '005abc',
      B2_APPLICATION_KEY: 'K005secret',
      VALKEY_URL: 'rediss://default:secret@valkey.aivencloud.com:15426',
      CACHE_TTL_SECONDS: '120',
      KAFKA_BROKERS: 'kafka.aivencloud.com:1234',
      KAFKA_SSL: 'true',
      KAFKA_SSL_CA:
        '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----',
      KAFKA_SASL_MECHANISM: 'SCRAM-SHA-256',
      KAFKA_USERNAME: 'avnadmin',
      KAFKA_PASSWORD: 'secret',
    });

    // Assert
    expect(env.app.port).toBe(10000);
    expect(env.storage.b2).toEqual({
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      bucket: 'catalogo-productos-dev-2026',
      keyId: '005abc',
      applicationKey: 'K005secret',
      signedUrlTtlSeconds: 900,
    });
    expect(env.cache).toMatchObject({ provider: 'valkey', ttlSeconds: 120 });
    expect(env.kafka.ssl?.ca).toBe(
      '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----',
    );
    expect(env.kafka.sasl?.mechanism).toBe('scram-sha-256');
  });

  it('debe exigir B2_REGION si el endpoint no es de Backblaze', () => {
    expect(() =>
      loadEnv({
        ...LOCAL,
        STORAGE_PROVIDER: 'b2',
        B2_ENDPOINT: 'http://localhost:5000',
        B2_BUCKET: 'b',
        B2_KEY_ID: 'k',
        B2_APPLICATION_KEY: 's',
      }),
    ).toThrow(/B2_REGION es requerida/);
  });

  it.each([
    [{ PORT: 'abc' }, /PORT debe ser un entero positivo/],
    [{ STORAGE_PROVIDER: 's3' }, /STORAGE_PROVIDER debe ser uno de/],
    [{ CACHE_PROVIDER: 'redis' }, /CACHE_PROVIDER debe ser uno de/],
    [
      { CACHE_TTL_SECONDS: '0' },
      /CACHE_TTL_SECONDS debe ser un entero positivo/,
    ],
    [{ KAFKA_ENABLED: 'si' }, /KAFKA_ENABLED debe ser "true" o "false"/],
    [
      { CACHE_PROVIDER: 'valkey', VALKEY_URL: 'default:clave@host:15426' },
      /VALKEY_URL debe empezar por rediss:\/\//,
    ],
    [
      { STORAGE_PROVIDER: 'b2', B2_ENDPOINT: 's3.us-east-005.backblazeb2.com' },
      /B2_ENDPOINT debe ser una URL http\(s\) válida/,
    ],
  ])('debe rechazar valores inválidos %j', (override, message) => {
    expect(() => loadEnv({ ...LOCAL, ...override })).toThrow(message);
  });

  it('no debe incluir secretos en los mensajes de error', () => {
    // Act
    const act = (): unknown =>
      loadEnv({
        ...LOCAL,
        B2_APPLICATION_KEY: 'super-secreta',
        VALKEY_URL: 'rediss://x:clave@h:1',
        PORT: 'x',
      });

    // Assert
    expect(act).toThrow(
      expect.objectContaining({
        message: expect.not.stringMatching(/super-secreta|clave/),
      }),
    );
  });
});
