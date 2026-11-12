import { CreateProductCommand } from '../../../../application/service/dto/command/create-product.command';
import { UpdateProductCommand } from '../../../../application/service/dto/command/update-product.command';
import { UploadProductImageCommand } from '../../../../application/service/dto/command/upload-product-image.command';
import type { ProductImageUrlResult } from '../../../../application/service/dto/result/product-image-url.result';
import { InvalidProductImageException } from '../../../../domain/exception/invalid-product-image.exception';
import { InvalidProductException } from '../../../../domain/exception/invalid-product.exception';
import { ProductNotFoundException } from '../../../../domain/exception/product-not-found.exception';
import type { ProductModel } from '../../../../domain/model/product.model';
import type { ProductImageUrlResponse } from '../dto/product-image-url.response';
import type { ProductResponse } from '../dto/product.response';
import type { UploadedImageFile } from '../dto/uploaded-image.file';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Traduce HTTP ↔ comandos de aplicación. Valida tipos; las reglas de negocio las valida el dominio. */
export class ProductRestMapper {
  private constructor() {}

  /** Los ids son UUID: cualquier otro valor no puede existir y no se consulta al bucket. */
  static toProductId(rawId: string): string {
    if (!UUID_PATTERN.test(rawId)) {
      throw ProductNotFoundException.becauseIdDoesNotExist(rawId);
    }
    return rawId.toLowerCase();
  }

  static toCreateCommand(body: unknown): CreateProductCommand {
    const fields = ProductRestMapper.readFields(body);
    return new CreateProductCommand(
      fields.name,
      fields.description,
      fields.category,
      fields.price,
    );
  }

  static toUpdateCommand(
    productId: string,
    body: unknown,
  ): UpdateProductCommand {
    const fields = ProductRestMapper.readFields(body);
    return new UpdateProductCommand(
      productId,
      fields.name,
      fields.description,
      fields.category,
      fields.price,
    );
  }

  static toUploadCommand(
    productId: string,
    file: UploadedImageFile | undefined,
  ): UploadProductImageCommand {
    if (file === undefined) {
      throw InvalidProductImageException.becauseFileIsMissing();
    }
    return new UploadProductImageCommand(productId, file.buffer, file.mimetype);
  }

  static toResponse(product: ProductModel): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.value,
      hasImage: product.hasImage,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  static toImageUrlResponse(
    result: ProductImageUrlResult,
  ): ProductImageUrlResponse {
    return {
      productId: result.productId,
      url: result.url,
      expiresInSeconds: result.expiresInSeconds,
    };
  }

  private static readFields(body: unknown): {
    name: string;
    description: string;
    category: string;
    price: number;
  } {
    const source = isRecord(body) ? body : {};
    return {
      name: ProductRestMapper.text(source, 'name', true),
      description: ProductRestMapper.text(source, 'description', false),
      category: ProductRestMapper.text(source, 'category', true),
      price: ProductRestMapper.number(source, 'price'),
    };
  }

  private static text(
    source: Record<string, unknown>,
    field: string,
    required: boolean,
  ): string {
    const value = source[field];
    if (value === undefined || value === null) {
      if (required) {
        throw InvalidProductException.becauseFieldIsBlank(field);
      }
      return '';
    }
    if (typeof value !== 'string') {
      throw InvalidProductException.becauseFieldHasInvalidType(field, 'texto');
    }
    return value;
  }

  private static number(
    source: Record<string, unknown>,
    field: string,
  ): number {
    const value = source[field];
    if (value === undefined || value === null || value === '') {
      throw InvalidProductException.becauseFieldIsBlank(field);
    }
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (typeof parsed !== 'number' || Number.isNaN(parsed)) {
      throw InvalidProductException.becauseFieldHasInvalidType(field, 'número');
    }
    return parsed;
  }
}
