import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PRODUCT_EVENT_PUBLISHER_PORT } from './../src/application/port/out/product-event-publisher.port';
import type { DomainEvent } from './../src/domain/event/domain-event';

/** PNG de 1×1 px. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('Product Service (e2e)', () => {
  let app: INestApplication<App>;
  const published: DomainEvent[] = [];

  beforeAll(async () => {
    process.env.STORAGE_PROVIDER = 'memory';
    process.env.CACHE_PROVIDER = 'memory';
    process.env.KAFKA_ENABLED = 'false';
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PRODUCT_EVENT_PUBLISHER_PORT)
      .useValue({
        publish: (event: DomainEvent): Promise<void> => {
          published.push(event);
          return Promise.resolve();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    published.length = 0;
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  const createProduct = async (): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Camiseta azul',
        description: 'Algodón',
        category: 'Ropa',
        price: 45000,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  it('GET /health responde UP', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'UP', service: 'product-service' }));

  it('ciclo completo: crear → consultar (MISS, HIT) → actualizar → imagen → eliminar', async () => {
    // Crear
    const id = await createProduct();
    expect(published.map((event) => event.eventName)).toEqual([
      'product.created',
    ]);

    // Primera consulta: sale del almacenamiento; la segunda, de la caché
    const miss = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .expect(200);
    expect(miss.headers['x-cache']).toBe('MISS');
    expect(miss.body).toMatchObject({
      id,
      category: 'ropa',
      price: 45000,
      hasImage: false,
    });
    const hit = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .expect(200);
    expect(hit.headers['x-cache']).toBe('HIT');

    // Actualizar invalida la caché
    await request(app.getHttpServer())
      .put(`/products/${id}`)
      .send({ name: 'Camiseta roja', category: 'ropa', price: 50000 })
      .expect(200)
      .expect((response) =>
        expect(response.body).toMatchObject({ name: 'Camiseta roja' }),
      );
    const afterUpdate = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .expect(200);
    expect(afterUpdate.headers['x-cache']).toBe('MISS');
    expect(afterUpdate.body).toMatchObject({
      name: 'Camiseta roja',
      price: 50000,
    });

    // Imagen: sin imagen → 404; se sube; se obtiene la URL de descarga
    await request(app.getHttpServer()).get(`/products/${id}/image`).expect(404);
    await request(app.getHttpServer())
      .post(`/products/${id}/image`)
      .attach('file', PNG, { filename: 'foto.png', contentType: 'image/png' })
      .expect(200)
      .expect((response) =>
        expect(response.body).toMatchObject({ hasImage: true }),
      );
    const image = await request(app.getHttpServer())
      .get(`/products/${id}/image`)
      .expect(200);
    expect(image.body).toMatchObject({ productId: id, expiresInSeconds: 900 });
    expect(image.body.url).toBe(
      `data:image/png;base64,${PNG.toString('base64')}`,
    );

    // Eliminar
    await request(app.getHttpServer()).delete(`/products/${id}`).expect(204);
    await request(app.getHttpServer()).get(`/products/${id}`).expect(404);
    expect(published.map((event) => event.eventName)).toEqual([
      'product.created',
      'product.updated',
      'product.updated',
      'product.deleted',
    ]);
  });

  it.each([
    [{ category: 'ropa', price: 10 }, /"name"/],
    [{ name: 'X', category: 'ropa', price: -1 }, /mayor que cero/],
    [{ name: 'X', category: 'ropa', price: 'caro' }, /número/],
    [{ name: 42, category: 'ropa', price: 10 }, /texto/],
  ])(
    'POST /products responde 400 con un cuerpo inválido %j',
    async (body, message) => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(body)
        .expect(400);

      expect(response.body.message).toMatch(message);
      expect(published).toHaveLength(0);
    },
  );

  it('responde 404 para un id inexistente o mal formado', async () => {
    await request(app.getHttpServer())
      .get('/products/00000000-0000-4000-8000-000000000000')
      .expect(404);
    await request(app.getHttpServer()).get('/products/no-es-uuid').expect(404);
  });

  it('rechaza imágenes de tipo no permitido (400) o demasiado grandes (413)', async () => {
    const id = await createProduct();

    await request(app.getHttpServer())
      .post(`/products/${id}/image`)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/products/${id}/image`)
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1), {
        filename: 'grande.png',
        contentType: 'image/png',
      })
      .expect(413);
    await request(app.getHttpServer())
      .post(`/products/${id}/image`)
      .expect(400);
  });
});
