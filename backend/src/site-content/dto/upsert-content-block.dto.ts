import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** Body for creating or replacing a static content block (keyed by its URL slug). */
export class UpsertContentBlockDto {
  @ApiProperty({ example: 'About Us', minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({
    example: '# About\nWe sell great things.',
    description: 'Markdown / rich text body for the static page',
    minLength: 1,
    maxLength: 50_000,
  })
  @IsString()
  @Length(1, 50_000)
  body!: string;
}
