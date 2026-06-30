import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ArticlesService } from './articles.service';
import { ArticleQueryDto } from './dto/article-query.dto';
import {
  ArticleCategoryWithCountDto,
  ArticleListItemDto,
  ArticleResponseDto,
  PaginatedArticlesDto,
} from './dto/article-response.dto';

@ApiTags('articles')
@Public() // the journal is public; all read endpoints expose PUBLISHED content only
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List published articles (search / category / paginate)' })
  @ApiOkResponse({ type: PaginatedArticlesDto })
  findPublished(@Query() query: ArticleQueryDto): Promise<PaginatedArticlesDto> {
    return this.articles.findPublished(query);
  }

  // NOTE: declared before ':slug' so "categories" isn't captured as a slug param.
  @Get('categories')
  @ApiOperation({ summary: 'List article categories that have published articles' })
  @ApiOkResponse({ type: ArticleCategoryWithCountDto, isArray: true })
  listCategories(): Promise<ArticleCategoryWithCountDto[]> {
    return this.articles.listCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single published article by slug' })
  @ApiOkResponse({ type: ArticleResponseDto })
  @ApiNotFoundResponse({ description: 'Article not found or not published' })
  findBySlug(@Param('slug') slug: string): Promise<ArticleResponseDto> {
    return this.articles.findBySlug(slug);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Related published articles (same category, newest first)' })
  @ApiOkResponse({ type: ArticleListItemDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Article not found or not published' })
  findRelated(@Param('slug') slug: string): Promise<ArticleListItemDto[]> {
    return this.articles.findRelated(slug);
  }
}
