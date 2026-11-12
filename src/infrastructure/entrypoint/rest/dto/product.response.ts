export interface ProductResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly price: number;
  readonly hasImage: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
