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
import { ArticlesService } from './articles.service';
import { AdminArticleQueryDto } from './dto/admin-article-query.dto';
import {
  AdminArticleResponseDto,
  PaginatedAdminArticlesDto,
} from './dto/admin-article-response.dto';
import { ArticleCategoryWithCountDto } from './dto/article-response.dto';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('admin: articles')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List all articles incl. drafts (admin)' })
  findAll(@Query() query: AdminArticleQueryDto): Promise<PaginatedAdminArticlesDto> {
    return this.articles.findAllForAdmin(query);
  }

  // NOTE: declared before ':id' so "categories" isn't captured as an id param.
  @Get('categories')
  @ApiOperation({ summary: 'List all article categories (admin)' })
  listCategories(): Promise<ArticleCategoryWithCountDto[]> {
    return this.articles.listCategoriesForAdmin();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create an article category' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  createCategory(@Body() dto: CreateArticleCategoryDto): Promise<ArticleCategoryWithCountDto> {
    return this.articles.createCategory(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single article incl. draft (admin)' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  findOne(@Param('id') id: string): Promise<AdminArticleResponseDto> {
    return this.articles.findOneForAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an article' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  create(@Body() dto: CreateArticleDto): Promise<AdminArticleResponseDto> {
    return this.articles.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an article' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto): Promise<AdminArticleResponseDto> {
    return this.articles.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish an article' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  publish(@Param('id') id: string): Promise<AdminArticleResponseDto> {
    return this.articles.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish an article (revert to draft)' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  unpublish(@Param('id') id: string): Promise<AdminArticleResponseDto> {
    return this.articles.unpublish(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an article' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.articles.remove(id);
  }
}
