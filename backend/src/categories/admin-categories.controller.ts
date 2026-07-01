import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { AdminCategoryQueryDto } from './dto/admin-category-query.dto';
import {
  CategoryResponseDto,
  PaginatedAdminCategoriesDto,
} from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('admin: categories')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories incl. inactive (search / status / sort / paginate)' })
  findAll(@Query() query: AdminCategoryQueryDto): Promise<PaginatedAdminCategoriesDto> {
    return this.categories.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category incl. inactive (admin)' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categories.findOneForAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiConflictResponse({ description: 'Name or slug already exists' })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a category' })
  @ApiConflictResponse({ description: 'Name or slug already exists' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.categories.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate (show) a category' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  activate(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categories.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate (hide) a category' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  deactivate(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categories.setActive(id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category (blocked while products are assigned)' })
  @ApiConflictResponse({ description: 'Category still has products assigned' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.categories.remove(id);
  }
}
