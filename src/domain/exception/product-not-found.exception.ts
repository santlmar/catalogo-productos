import { DomainException } from './domain.exception';

export class ProductNotFoundException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseIdDoesNotExist(productId: string): ProductNotFoundException {
    return new ProductNotFoundException(
      `No existe un producto con id "${productId}".`,
    );
  }
}
