import { existsSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './infrastructure/config/app.config';

const ENV_FILE = '.env';

/** En local se leen las variables de `.env`; en Render llegan por el entorno. */
function loadEnvFileIfPresent(): void {
  if (existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
  }
}

async function bootstrap(): Promise<void> {
  loadEnvFileIfPresent();
  const app = await NestFactory.create(AppModule);
  // Cierra el producer de Kafka y la conexión a Valkey al recibir SIGTERM (Render).
  app.enableShutdownHooks();

  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);
  new Logger('Bootstrap').log(
    `${config.serviceName} escuchando en el puerto ${config.port}`,
  );
}

void bootstrap();
