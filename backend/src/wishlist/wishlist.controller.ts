import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import {
  WishlistResponseDto,
  WishlistToggleResponseDto,
} from './dto/wishlist-response.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiCookieAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // Every operation is scoped to the authenticated user's id from the JWT. The client never
  // supplies a userId — there is no parameter to address another user's wishlist.

  @Get()
  @ApiOperation({ summary: "Get the current user's wishlist (newest first)" })
  @ApiOkResponse({ type: WishlistResponseDto })
  getWishlist(@CurrentUser() user: AuthenticatedUser): Promise<WishlistResponseDto> {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the wishlist (idempotent)' })
  @ApiOkResponse({ type: WishlistResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found or inactive' })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWishlistItemDto,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.addItem(user.id, dto.productId);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product from the wishlist (idempotent)' })
  @ApiOkResponse({ type: WishlistResponseDto })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.removeItem(user.id, productId);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle a product on the wishlist (add if absent, remove if present)' })
  @ApiOkResponse({ type: WishlistToggleResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found or inactive (when adding)' })
  toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWishlistItemDto,
  ): Promise<WishlistToggleResponseDto> {
    return this.wishlistService.toggle(user.id, dto.productId);
  }
}
