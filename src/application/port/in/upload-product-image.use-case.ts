import type { ProductModel } from '../../../domain/model/product.model';
import type { UploadProductImageCommand } from '../../service/dto/command/upload-product-image.command';

export const UPLOAD_PRODUCT_IMAGE_USE_CASE = Symbol(
  'UploadProductImageUseCase',
);

export interface UploadProductImageUseCase {
  /** @throws ProductNotFoundException | InvalidProductImageException */
  execute(command: UploadProductImageCommand): Promise<ProductModel>;
}
