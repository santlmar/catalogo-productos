import { DomainException } from './domain.exception';

/** Fallo al leer o escribir en el almacenamiento de objetos (bucket B2). */
export class FileStorageException extends DomainException {
  private constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }

  static becauseOperationFailed(
    operation: string,
    cause?: unknown,
  ): FileStorageException {
    return new FileStorageException(
      `No fue posible completar la operación "${operation}" en el almacenamiento de archivos.`,
      { cause },
    );
  }

  static becauseStoredDataIsCorrupt(objectKey: string): FileStorageException {
    return new FileStorageException(
      `El objeto "${objectKey}" del almacenamiento no tiene un formato válido.`,
    );
  }
}
