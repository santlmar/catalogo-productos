import type { ProductModel } from '../model/product.model';
import type { EventValue } from './domain-event';

/**
 * Estado completo del producto que viaja en los eventos `product.created` y
 * `product.updated`. Así el Search Service puede indexar sin consultar a este servicio.
 */
export function productSnapshot(
  product: ProductModel,
): Readonly<Record<string, EventValue>> {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price.value,
    hasImage: product.hasImage,
    updatedAt: product.updatedAt.toISOString(),
  };
}
