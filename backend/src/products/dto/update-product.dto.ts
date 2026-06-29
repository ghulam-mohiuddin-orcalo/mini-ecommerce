import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** All product fields are editable except the immutable SKU. */
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['sku'] as const)) {}
