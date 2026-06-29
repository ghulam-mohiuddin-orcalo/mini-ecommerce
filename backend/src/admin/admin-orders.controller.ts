import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminOrderQueryDto } from '../orders/dto/admin-order-query.dto';
import {
  AdminOrderResponseDto,
  PaginatedAdminOrdersDto,
} from '../orders/dto/admin-order-response.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { OrdersService } from '../orders/orders.service';

@ApiTags('admin: orders')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders (filter by status, search by customer)' })
  findAll(@Query() query: AdminOrderQueryDto): Promise<PaginatedAdminOrdersDto> {
    return this.orders.findAllForAdmin(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change order status (state-machine enforced; cancel restores stock)' })
  @ApiConflictResponse({ description: 'Invalid status transition' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<AdminOrderResponseDto> {
    return this.orders.updateStatus(id, dto.status);
  }
}
