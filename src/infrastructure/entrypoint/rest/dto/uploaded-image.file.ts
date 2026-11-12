/** Campos que se usan del archivo que entrega multer (`FileInterceptor`). */
export interface UploadedImageFile {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly size: number;
}
