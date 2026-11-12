import { Module } from '@nestjs/common';
import { Kafka, logLevel, type SASLOptions } from 'kafkajs';
import {
  KAFKA_CLIENT,
  KAFKA_CONFIG,
  type KafkaClient,
  type KafkaConfig,
  type KafkaSaslConfig,
} from './kafka.config';

/** Con Kafka deshabilitado el cliente nunca se conecta; solo necesita un broker válido. */
const PLACEHOLDER_BROKERS = ['localhost:9092'];

function toSaslOptions(sasl?: KafkaSaslConfig): SASLOptions | undefined {
  if (sasl === undefined) {
    return undefined;
  }
  const credentials = { username: sasl.username, password: sasl.password };
  switch (sasl.mechanism) {
    case 'plain':
      return { mechanism: 'plain', ...credentials };
    case 'scram-sha-256':
      return { mechanism: 'scram-sha-256', ...credentials };
    case 'scram-sha-512':
      return { mechanism: 'scram-sha-512', ...credentials };
  }
}

export function createKafkaClient(config: KafkaConfig): KafkaClient {
  return new Kafka({
    clientId: config.clientId,
    brokers: config.enabled ? [...config.brokers] : PLACEHOLDER_BROKERS,
    ssl: config.ssl
      ? {
          ca: config.ssl.ca ? [config.ssl.ca] : undefined,
          cert: config.ssl.cert,
          key: config.ssl.key,
        }
      : false,
    sasl: toSaslOptions(config.sasl),
    logLevel: logLevel.WARN,
  });
}

@Module({
  providers: [
    {
      provide: KAFKA_CLIENT,
      inject: [KAFKA_CONFIG],
      useFactory: createKafkaClient,
    },
  ],
  exports: [KAFKA_CLIENT],
})
export class KafkaModule {}
