import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/** Every category field is editable; all are optional on a patch. */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
