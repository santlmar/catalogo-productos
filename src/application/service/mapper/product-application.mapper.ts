import type { ProductDetails } from '../../../domain/model/product.model';
import { Price } from '../../../domain/valueobject/price';
import type { CreateProductCommand } from '../dto/command/create-product.command';
import type { UpdateProductCommand } from '../dto/command/update-product.command';

export class ProductApplicationMapper {
  private constructor() {}

  static toDetails(
    command: CreateProductCommand | UpdateProductCommand,
  ): ProductDetails {
    return {
      name: command.name,
      description: command.description,
      category: command.category,
      price: Price.of(command.price),
    };
  }
}
