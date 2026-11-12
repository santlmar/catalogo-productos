import type { ProductImageUrlResult } from '../../service/dto/result/product-image-url.result';

export const GET_PRODUCT_IMAGE_URL_USE_CASE = Symbol(
  'GetProductImageUrlUseCase',
);

export interface GetProductImageUrlUseCase {
  /** @throws ProductNotFoundException | ProductImageNotFoundException */
  execute(productId: string): Promise<ProductImageUrlResult>;
}
