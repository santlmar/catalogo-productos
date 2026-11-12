export class ProductImageUrlResult {
  constructor(
    readonly productId: string,
    readonly url: string,
    readonly expiresInSeconds: number,
  ) {}
}
