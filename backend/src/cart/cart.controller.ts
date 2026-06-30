import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@ApiCookieAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Every operation is scoped to the authenticated user's id from the JWT. The client never
  // supplies a userId/cartId — there is no parameter to address another user's cart.

  @Get()
  @ApiOperation({ summary: "Get the current user's cart" })
  @ApiOkResponse({ type: CartResponseDto })
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add units of a product (merges into the existing line)' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found or inactive' })
  @ApiConflictResponse({ description: 'Requested quantity exceeds stock' })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Set the absolute quantity of a cart line' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Item not in cart, or product inactive' })
  @ApiConflictResponse({ description: 'Requested quantity exceeds stock' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(user.id, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a line from the cart' })
  @ApiQuery({
    name: 'variantId',
    required: false,
    description: 'Pins which variant line to remove (omit for variant-less products)',
  })
  @ApiOkResponse({ type: CartResponseDto })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(user.id, productId, variantId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear the cart' })
  @ApiOkResponse({ type: CartResponseDto })
  clear(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.clear(user.id);
  }
}
