import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiConflictResponse, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminProductQueryDto } from '../products/dto/admin-product-query.dto';
import {
  AdminProductResponseDto,
  PaginatedAdminProductsDto,
} from '../products/dto/admin-product-response.dto';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { ProductsService } from '../products/products.service';

@ApiTags('admin: products')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products incl. inactive (admin)' })
  findAll(@Query() query: AdminProductQueryDto): Promise<PaginatedAdminProductsDto> {
    return this.products.findAllForAdmin(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiConflictResponse({ description: 'SKU already exists' })
  create(@Body() dto: CreateProductDto): Promise<AdminProductResponseDto> {
    return this.products.createProduct(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a product' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<AdminProductResponseDto> {
    return this.products.updateProduct(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Soft-delete (deactivate) a product' })
  deactivate(@Param('id') id: string): Promise<AdminProductResponseDto> {
    return this.products.setActive(id, false);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a product' })
  reactivate(@Param('id') id: string): Promise<AdminProductResponseDto> {
    return this.products.setActive(id, true);
  }
}
