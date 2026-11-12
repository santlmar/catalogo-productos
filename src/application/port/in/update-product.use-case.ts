import type { ProductModel } from '../../../domain/model/product.model';
import type { UpdateProductCommand } from '../../service/dto/command/update-product.command';

export const UPDATE_PRODUCT_USE_CASE = Symbol('UpdateProductUseCase');

export interface UpdateProductUseCase {
  /** @throws ProductNotFoundException si el producto no existe. */
  execute(command: UpdateProductCommand): Promise<ProductModel>;
}
