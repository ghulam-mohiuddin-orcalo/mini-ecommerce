import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiCookieAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Checkout: create an order from the cart (transactional)' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Cart is empty' })
  @ApiConflictResponse({ description: 'A product is inactive or out of stock' })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's orders" })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  findMyOrders(@CurrentUser() user: AuthenticatedUser): Promise<OrderResponseDto[]> {
    return this.ordersService.findMyOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of the current user\'s orders' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found or not owned by the user' })
  findMyOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findMyOrder(user.id, id);
  }
}
