import type { ProductModel } from '../../../../domain/model/product.model';

export type ProductSource = 'cache' | 'storage';

export class ProductLookupResult {
  constructor(
    readonly product: ProductModel,
    /** De dónde se obtuvo el producto: permite evidenciar el funcionamiento de la caché. */
    readonly source: ProductSource,
  ) {}
}
