import { Inject, Injectable } from '@nestjs/common';
import { ProductImageNotFoundException } from '../../domain/exception/product-image-not-found.exception';
import type { GetProductImageUrlUseCase } from '../port/in/get-product-image-url.use-case';
import {
  GET_PRODUCT_USE_CASE,
  type GetProductUseCase,
} from '../port/in/get-product.use-case';
import {
  PRODUCT_IMAGE_STORAGE_PORT,
  type ProductImageStoragePort,
} from '../port/out/product-image-storage.port';
import { ProductImageUrlResult } from './dto/result/product-image-url.result';

/** El bucket es privado: el cliente recibe una URL firmada que expira. */
@Injectable()
export class GetProductImageUrlService implements GetProductImageUrlUseCase {
  constructor(
    @Inject(GET_PRODUCT_USE_CASE)
    private readonly getProduct: GetProductUseCase,
    @Inject(PRODUCT_IMAGE_STORAGE_PORT)
    private readonly imageStorage: ProductImageStoragePort,
  ) {}

  async execute(productId: string): Promise<ProductImageUrlResult> {
    const { product } = await this.getProduct.execute(productId);
    if (product.imageKey === null) {
      throw ProductImageNotFoundException.becauseProductHasNoImage(productId);
    }
    const signed = await this.imageStorage.createDownloadUrl(product.imageKey);
    return new ProductImageUrlResult(
      product.id,
      signed.url,
      signed.expiresInSeconds,
    );
  }
}
