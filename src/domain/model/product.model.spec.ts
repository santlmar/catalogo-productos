import { InvalidProductException } from '../exception/invalid-product.exception';
import { Price } from '../valueobject/price';
import { ProductModel, type ProductDetails } from './product.model';

describe('ProductModel', () => {
  const createdAt = new Date('2026-11-01T10:00:00.000Z');
  const later = new Date('2026-11-02T10:00:00.000Z');
  const details: ProductDetails = {
    name: '  Camiseta azul ',
    description: 'Algodón 100 %',
    category: ' Ropa ',
    price: Price.of(45000),
  };

  it('debe crearse sin imagen, con texto normalizado y categoría en minúsculas', () => {
    // Act
    const product = ProductModel.create('p-1', details, createdAt);

    // Assert
    expect(product).toMatchObject({
      id: 'p-1',
      name: 'Camiseta azul',
      description: 'Algodón 100 %',
      category: 'ropa',
      imageKey: null,
      createdAt,
      updatedAt: createdAt,
    });
    expect(product.hasImage).toBe(false);
  });

  it('debe permitir una descripción vacía', () => {
    const product = ProductModel.create(
      'p-1',
      { ...details, description: '   ' },
      createdAt,
    );

    expect(product.description).toBe('');
  });

  it('update debe devolver una nueva instancia conservando id, imagen y fecha de creación', () => {
    // Arrange
    const original = ProductModel.create('p-1', details, createdAt).withImage(
      'images/p-1',
      createdAt,
    );

    // Act
    const updated = original.update(
      { ...details, name: 'Camiseta roja' },
      later,
    );

    // Assert
    expect(updated).not.toBe(original);
    expect(original.name).toBe('Camiseta azul');
    expect(updated).toMatchObject({
      id: 'p-1',
      name: 'Camiseta roja',
      imageKey: 'images/p-1',
      createdAt,
      updatedAt: later,
    });
  });

  it('withImage debe asociar la clave del objeto y actualizar la fecha', () => {
    // Act
    const product = ProductModel.create('p-1', details, createdAt).withImage(
      'images/p-1',
      later,
    );

    // Assert
    expect(product.hasImage).toBe(true);
    expect(product.imageKey).toBe('images/p-1');
    expect(product.updatedAt).toBe(later);
  });

  it.each([
    ['name', { name: '  ' }],
    ['category', { category: '' }],
  ])('debe rechazar "%s" en blanco', (_field, override) => {
    expect(() =>
      ProductModel.create('p-1', { ...details, ...override }, createdAt),
    ).toThrow(expect.any(InvalidProductException));
  });

  it.each([
    ['name', { name: 'x'.repeat(121) }],
    ['description', { description: 'x'.repeat(1001) }],
    ['category', { category: 'x'.repeat(61) }],
  ])('debe rechazar "%s" demasiado largo', (_field, override) => {
    expect(() =>
      ProductModel.create('p-1', { ...details, ...override }, createdAt),
    ).toThrow(/como máximo/);
  });
});
