import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/** Body for adding or toggling a product on the authenticated user's wishlist. */
export class AddWishlistItemDto {
  @ApiProperty({ example: 'cuid_abc123' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  productId!: string;
}
