import { ProductModel } from '../../../domain/model/product.model';
import { Price } from '../../../domain/valueobject/price';

/** Forma JSON con la que se guarda un producto en el bucket y en la caché. */
export interface ProductDocument {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly price: number;
  readonly imageKey: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class ProductPersistenceMapper {
  private constructor() {}

  static toJson(product: ProductModel): string {
    const document: ProductDocument = {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.value,
      imageKey: product.imageKey,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
    return JSON.stringify(document);
  }

  /** @throws Error si el JSON no corresponde a un producto válido. */
  static fromJson(raw: string): ProductModel {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      throw new TypeError('El documento no es un objeto JSON.');
    }
    const text = (field: string): string => {
      const value = parsed[field];
      if (typeof value !== 'string') {
        throw new TypeError(`El campo "${field}" no es texto.`);
      }
      return value;
    };
    const date = (field: string): Date => {
      const value = new Date(text(field));
      if (Number.isNaN(value.getTime())) {
        throw new TypeError(`El campo "${field}" no es una fecha.`);
      }
      return value;
    };
    if (typeof parsed.price !== 'number') {
      throw new TypeError('El campo "price" no es numérico.');
    }
    if (parsed.imageKey !== null && typeof parsed.imageKey !== 'string') {
      throw new TypeError('El campo "imageKey" no es texto.');
    }
    return ProductModel.restore({
      id: text('id'),
      name: text('name'),
      description: text('description'),
      category: text('category'),
      price: Price.of(parsed.price),
      imageKey: parsed.imageKey,
      createdAt: date('createdAt'),
      updatedAt: date('updatedAt'),
    });
  }
}
