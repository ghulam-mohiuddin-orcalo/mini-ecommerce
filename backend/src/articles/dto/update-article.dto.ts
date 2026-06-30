import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

/** All article fields are editable on update. */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
