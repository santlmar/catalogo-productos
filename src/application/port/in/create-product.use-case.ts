import type { ProductModel } from '../../../domain/model/product.model';
import type { CreateProductCommand } from '../../service/dto/command/create-product.command';

export const CREATE_PRODUCT_USE_CASE = Symbol('CreateProductUseCase');

export interface CreateProductUseCase {
  execute(command: CreateProductCommand): Promise<ProductModel>;
}
