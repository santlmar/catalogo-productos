import { InvalidProductException } from '../exception/invalid-product.exception';
import type { Price } from '../valueobject/price';

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 60;

/** Datos editables de un producto. */
export interface ProductDetails {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly price: Price;
}

export interface ProductProps extends ProductDetails {
  readonly id: string;
  /** Clave del objeto en el bucket; `null` si el producto aún no tiene imagen. */
  readonly imageKey: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Producto del catálogo. Inmutable: cada cambio devuelve una nueva instancia. */
export class ProductModel {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly price: Price;
  readonly imageKey: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProductProps) {
    this.id = ProductModel.requireText(props.id, 'id', Number.MAX_SAFE_INTEGER);
    this.name = ProductModel.requireText(props.name, 'name', MAX_NAME_LENGTH);
    this.description = ProductModel.optionalText(
      props.description,
      'description',
      MAX_DESCRIPTION_LENGTH,
    );
    // La categoría se normaliza para que los filtros de búsqueda sean exactos.
    this.category = ProductModel.requireText(
      props.category,
      'category',
      MAX_CATEGORY_LENGTH,
    ).toLowerCase();
    this.price = props.price;
    this.imageKey =
      props.imageKey === null
        ? null
        : ProductModel.requireText(
            props.imageKey,
            'imageKey',
            Number.MAX_SAFE_INTEGER,
          );
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, details: ProductDetails, now: Date): ProductModel {
    return new ProductModel({
      ...details,
      id,
      imageKey: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye un producto ya persistido (bucket o caché). */
  static restore(props: ProductProps): ProductModel {
    return new ProductModel(props);
  }

  get hasImage(): boolean {
    return this.imageKey !== null;
  }

  update(details: ProductDetails, now: Date): ProductModel {
    return new ProductModel({ ...this.toProps(), ...details, updatedAt: now });
  }

  withImage(imageKey: string, now: Date): ProductModel {
    return new ProductModel({ ...this.toProps(), imageKey, updatedAt: now });
  }

  private toProps(): ProductProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      price: this.price,
      imageKey: this.imageKey,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static requireText(
    value: string,
    fieldName: string,
    maxLength: number,
  ): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw InvalidProductException.becauseFieldIsBlank(fieldName);
    }
    if (normalized.length > maxLength) {
      throw InvalidProductException.becauseFieldIsTooLong(fieldName, maxLength);
    }
    return normalized;
  }

  private static optionalText(
    value: string,
    fieldName: string,
    maxLength: number,
  ): string {
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw InvalidProductException.becauseFieldIsTooLong(fieldName, maxLength);
    }
    return normalized;
  }
}
