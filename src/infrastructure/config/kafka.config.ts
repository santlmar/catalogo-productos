import type { Kafka } from 'kafkajs';

export const KAFKA_CONFIG = Symbol('KafkaConfig');
export const KAFKA_CLIENT = Symbol('KafkaClient');

export type KafkaSaslMechanism = 'plain' | 'scram-sha-256' | 'scram-sha-512';

export interface KafkaSslConfig {
  /** Certificado de la CA (PEM). Aiven lo entrega como `ca.pem`. */
  readonly ca?: string;
  /** Certificado de acceso (PEM) para autenticación mTLS. */
  readonly cert?: string;
  /** Llave de acceso (PEM) para autenticación mTLS. */
  readonly key?: string;
}

export interface KafkaSaslConfig {
  readonly mechanism: KafkaSaslMechanism;
  readonly username: string;
  readonly password: string;
}

export interface KafkaConfig {
  /** Si es `false` el servicio arranca sin conectarse a Kafka (útil en local). */
  readonly enabled: boolean;
  readonly brokers: readonly string[];
  readonly clientId: string;
  readonly productEventsTopic: string;
  readonly ssl?: KafkaSslConfig;
  readonly sasl?: KafkaSaslConfig;
}

export type KafkaClient = Kafka;
