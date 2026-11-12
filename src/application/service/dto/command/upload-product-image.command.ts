export class UploadProductImageCommand {
  constructor(
    readonly productId: string,
    readonly content: Uint8Array,
    readonly contentType: string,
  ) {}
}
