import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  CREATE_PRODUCT_USE_CASE,
  type CreateProductUseCase,
} from '../../../application/port/in/create-product.use-case';
import {
  DELETE_PRODUCT_USE_CASE,
  type DeleteProductUseCase,
} from '../../../application/port/in/delete-product.use-case';
import {
  GET_PRODUCT_IMAGE_URL_USE_CASE,
  type GetProductImageUrlUseCase,
} from '../../../application/port/in/get-product-image-url.use-case';
import {
  GET_PRODUCT_USE_CASE,
  type GetProductUseCase,
} from '../../../application/port/in/get-product.use-case';
import {
  UPDATE_PRODUCT_USE_CASE,
  type UpdateProductUseCase,
} from '../../../application/port/in/update-product.use-case';
import {
  UPLOAD_PRODUCT_IMAGE_USE_CASE,
  type UploadProductImageUseCase,
} from '../../../application/port/in/upload-product-image.use-case';
import { ProductImage } from '../../../domain/valueobject/product-image';
import type { ProductImageUrlResponse } from './dto/product-image-url.response';
import type { ProductResponse } from './dto/product.response';
import type { UploadedImageFile } from './dto/uploaded-image.file';
import { ProductRestMapper } from './mapper/product-rest.mapper';

/** Adaptador de entrada HTTP. Solo traduce y delega en los casos de uso. */
@Controller('products')
export class ProductController {
  constructor(
    @Inject(CREATE_PRODUCT_USE_CASE)
    private readonly createProduct: CreateProductUseCase,
    @Inject(GET_PRODUCT_USE_CASE)
    private readonly getProduct: GetProductUseCase,
    @Inject(UPDATE_PRODUCT_USE_CASE)
    private readonly updateProduct: UpdateProductUseCase,
    @Inject(DELETE_PRODUCT_USE_CASE)
    private readonly deleteProduct: DeleteProductUseCase,
    @Inject(UPLOAD_PRODUCT_IMAGE_USE_CASE)
    private readonly uploadProductImage: UploadProductImageUseCase,
    @Inject(GET_PRODUCT_IMAGE_URL_USE_CASE)
    private readonly getProductImageUrl: GetProductImageUrlUseCase,
  ) {}

  @Post()
  async create(@Body() body: unknown): Promise<ProductResponse> {
    const product = await this.createProduct.execute(
      ProductRestMapper.toCreateCommand(body),
    );
    return ProductRestMapper.toResponse(product);
  }

  /** La cabecera `X-Cache: HIT | MISS` evidencia si la respuesta salió de Valkey. */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ProductResponse> {
    const result = await this.getProduct.execute(
      ProductRestMapper.toProductId(id),
    );
    response.setHeader('X-Cache', result.source === 'cache' ? 'HIT' : 'MISS');
    return ProductRestMapper.toResponse(result.product);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ProductResponse> {
    const command = ProductRestMapper.toUpdateCommand(
      ProductRestMapper.toProductId(id),
      body,
    );
    return ProductRestMapper.toResponse(
      await this.updateProduct.execute(command),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteProduct.execute(ProductRestMapper.toProductId(id));
  }

  /** `multipart/form-data` con el archivo en el campo `file`. */
  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ProductImage.MAX_BYTES, files: 1 },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile | undefined,
  ): Promise<ProductResponse> {
    const command = ProductRestMapper.toUploadCommand(
      ProductRestMapper.toProductId(id),
      file,
    );
    return ProductRestMapper.toResponse(
      await this.uploadProductImage.execute(command),
    );
  }

  @Get(':id/image')
  async imageUrl(@Param('id') id: string): Promise<ProductImageUrlResponse> {
    const result = await this.getProductImageUrl.execute(
      ProductRestMapper.toProductId(id),
    );
    return ProductRestMapper.toImageUrlResponse(result);
  }
}
