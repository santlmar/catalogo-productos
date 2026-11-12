# product-service

Microservicio de productos del catálogo. Arquitectura hexagonal, NestJS 12.

- CRUD de productos. Cada producto se guarda como `products/<id>.json` en un bucket
  privado de **Backblaze B2** (Guía 9).
- Imágenes en el mismo bucket (`images/<id>`), con descarga por **URL firmada**.
- **Caché distribuida en Valkey** (Guía 10) con *cache-aside* y TTL. La cabecera
  `X-Cache` indica `HIT` o `MISS`.
- Publica `product.created`, `product.updated` y `product.deleted` en el tópico Kafka
  `product-events`, que consume `search-service`.

## Ejecutar

```bash
cp .env.example .env    # modo local: todo en memoria, Kafka deshabilitado
npm install
npm run start:dev       # http://localhost:3001
```

Para usar los servicios cloud, cambia a `STORAGE_PROVIDER=b2`, `CACHE_PROVIDER=valkey` y
`KAFKA_ENABLED=true`, y completa las variables documentadas en `.env.example`. Si falta
alguna variable, el servicio no arranca y muestra en un solo mensaje todas las que faltan.

## Endpoints

| Método | Ruta | |
|---|---|---|
| `POST` | `/products` | `{ "name", "description"?, "category", "price" }` |
| `GET` | `/products/:id` | Cabecera `X-Cache: HIT \| MISS` |
| `PUT` | `/products/:id` | Mismo cuerpo que `POST` |
| `DELETE` | `/products/:id` | 204 |
| `POST` | `/products/:id/image` | `multipart/form-data`, campo `file` (JPEG, PNG o WebP, ≤ 2 MB) |
| `GET` | `/products/:id/image` | URL firmada temporal |
| `GET` | `/health` | |

## Scripts

`npm test` · `npm run test:e2e` · `npm run lint` · `npm run build` · `npm run start:prod`

Requiere Node.js ≥ 24.15. El proyecto completo y la configuración de cada servicio cloud
están en el `README.md` de la raíz.
# catalogo-productos
