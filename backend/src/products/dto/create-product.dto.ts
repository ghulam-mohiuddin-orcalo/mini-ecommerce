import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUrl, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'TEE-010', description: 'Unique stock-keeping unit' })
  @IsString()
  @Length(1, 64)
  sku!: string;

  @ApiProperty({ example: 'Classic Cotton Tee' })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ example: 'A soft, breathable everyday t-shirt.' })
  @IsString()
  @Length(1, 2000)
  description!: string;

  @ApiProperty({ example: 1999, description: 'Price in integer cents' })
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;

  @ApiProperty({ example: 'https://picsum.photos/seed/tee/600/400' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  imageUrl!: string;

  @ApiProperty({ example: 'Apparel' })
  @IsString()
  @Length(1, 50)
  category!: string;

  @ApiProperty({ example: 100, description: 'Units in stock' })
  @IsInt()
  @Min(0)
  stock!: number;
}
