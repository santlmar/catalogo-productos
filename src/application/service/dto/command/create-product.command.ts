export class CreateProductCommand {
  constructor(
    readonly name: string,
    readonly description: string,
    readonly category: string,
    readonly price: number,
  ) {}
}
