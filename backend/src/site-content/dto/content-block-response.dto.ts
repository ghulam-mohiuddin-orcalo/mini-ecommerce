import { ApiProperty } from '@nestjs/swagger';
import { ContentBlock } from '@prisma/client';

/** A static content block (about / privacy / terms / ...). `key` is the natural id. */
export class ContentBlockResponseDto {
  @ApiProperty({ example: 'about' }) key!: string;
  @ApiProperty({ example: 'About Us' }) title!: string;
  @ApiProperty({ description: 'Markdown / rich text body' }) body!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export function toContentBlockResponse(block: ContentBlock): ContentBlockResponseDto {
  return { key: block.key, title: block.title, body: block.body, updatedAt: block.updatedAt };
}
