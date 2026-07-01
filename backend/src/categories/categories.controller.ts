import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@Public() // the category taxonomy is public; only ACTIVE categories are ever exposed
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List active categories (ordered, with active-product counts)' })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  findAll(): Promise<CategoryResponseDto[]> {
    return this.categories.findAllActive();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single active category by slug' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found or inactive' })
  findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categories.findBySlug(slug);
  }
}
