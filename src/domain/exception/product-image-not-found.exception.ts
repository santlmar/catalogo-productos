import { DomainException } from './domain.exception';

export class ProductImageNotFoundException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseProductHasNoImage(
    productId: string,
  ): ProductImageNotFoundException {
    return new ProductImageNotFoundException(
      `El producto "${productId}" todavía no tiene una imagen cargada.`,
    );
  }
}
