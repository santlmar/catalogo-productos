export const DELETE_PRODUCT_USE_CASE = Symbol('DeleteProductUseCase');

export interface DeleteProductUseCase {
  /** @throws ProductNotFoundException si el producto no existe. */
  execute(productId: string): Promise<void>;
}
