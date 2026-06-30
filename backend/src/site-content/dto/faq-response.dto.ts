import { ApiProperty } from '@nestjs/swagger';
import { FaqCategory, FaqItem } from '@prisma/client';

/** A single FAQ question/answer in display order. */
export class FaqItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() question!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ example: 0 }) position!: number;
}

/** A FAQ category with its items nested in display order (the grouped public shape). */
export class FaqCategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 0 }) position!: number;
  @ApiProperty({ type: FaqItemResponseDto, isArray: true }) items!: FaqItemResponseDto[];
}

type FaqCategoryWithItems = FaqCategory & { items: FaqItem[] };

export function toFaqItemResponse(item: FaqItem): FaqItemResponseDto {
  return { id: item.id, question: item.question, body: item.body, position: item.position };
}

export function toFaqCategoryResponse(category: FaqCategoryWithItems): FaqCategoryResponseDto {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    position: category.position,
    items: category.items.map(toFaqItemResponse),
  };
}
