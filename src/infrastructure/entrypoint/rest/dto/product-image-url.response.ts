export interface ProductImageUrlResponse {
  readonly productId: string;
  /** URL firmada de Backblaze B2; deja de funcionar al cumplirse `expiresInSeconds`. */
  readonly url: string;
  readonly expiresInSeconds: number;
}
