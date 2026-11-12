import { Controller, Get, Inject } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/app.config';

/** Usado por Render como `healthCheckPath`. */
@Controller('health')
export class HealthController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Get()
  check(): { status: string; service: string } {
    return { status: 'UP', service: this.config.serviceName };
  }
}
