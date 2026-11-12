import type { ProductLookupResult } from '../../service/dto/result/product-lookup.result';

export const GET_PRODUCT_USE_CASE = Symbol('GetProductUseCase');

export interface GetProductUseCase {
  /** @throws ProductNotFoundException si el producto no existe. */
  execute(productId: string): Promise<ProductLookupResult>;
}
