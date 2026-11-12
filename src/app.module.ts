import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from './infrastructure/config/config.module';
import { ProductModule } from './infrastructure/config/product.module';
import { DomainExceptionFilter } from './infrastructure/entrypoint/rest/filter/domain-exception.filter';
import { HealthController } from './infrastructure/entrypoint/rest/health.controller';
import { ProductController } from './infrastructure/entrypoint/rest/product.controller';

@Module({
  imports: [ConfigModule, ProductModule],
  controllers: [HealthController, ProductController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
