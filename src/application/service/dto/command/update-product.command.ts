export class UpdateProductCommand {
  constructor(
    readonly productId: string,
    readonly name: string,
    readonly description: string,
    readonly category: string,
    readonly price: number,
  ) {}
}
