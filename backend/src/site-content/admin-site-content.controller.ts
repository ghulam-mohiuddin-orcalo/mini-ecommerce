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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminContactQueryDto } from './dto/admin-contact-query.dto';
import {
  ContactMessageResponseDto,
  PaginatedContactMessagesDto,
} from './dto/contact-message-response.dto';
import { ContentBlockResponseDto } from './dto/content-block-response.dto';
import { CreateFaqCategoryDto, UpdateFaqCategoryDto } from './dto/create-faq-category.dto';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/create-faq-item.dto';
import { FaqCategoryResponseDto, FaqItemResponseDto } from './dto/faq-response.dto';
import { MarkHandledDto } from './dto/mark-handled.dto';
import { UpsertContentBlockDto } from './dto/upsert-content-block.dto';
import { SiteContentService } from './site-content.service';

@ApiTags('admin: content')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminSiteContentController {
  constructor(private readonly siteContent: SiteContentService) {}

  // --- FAQ categories --------------------------------------------------------------

  @Post('faq/categories')
  @ApiOperation({ summary: 'Create a FAQ category' })
  @ApiOkResponse({ type: FaqCategoryResponseDto })
  createFaqCategory(@Body() dto: CreateFaqCategoryDto): Promise<FaqCategoryResponseDto> {
    return this.siteContent.createFaqCategory(dto);
  }

  @Patch('faq/categories/:id')
  @ApiOperation({ summary: 'Update / reorder a FAQ category' })
  @ApiNotFoundResponse({ description: 'FAQ category not found' })
  updateFaqCategory(
    @Param('id') id: string,
    @Body() dto: UpdateFaqCategoryDto,
  ): Promise<FaqCategoryResponseDto> {
    return this.siteContent.updateFaqCategory(id, dto);
  }

  @Delete('faq/categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a FAQ category (its items cascade)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'FAQ category not found' })
  removeFaqCategory(@Param('id') id: string): Promise<void> {
    return this.siteContent.removeFaqCategory(id);
  }

  // --- FAQ items -------------------------------------------------------------------

  @Post('faq/items')
  @ApiOperation({ summary: 'Create a FAQ item under a category' })
  @ApiOkResponse({ type: FaqItemResponseDto })
  createFaqItem(@Body() dto: CreateFaqItemDto): Promise<FaqItemResponseDto> {
    return this.siteContent.createFaqItem(dto);
  }

  @Patch('faq/items/:id')
  @ApiOperation({ summary: 'Update / move / reorder a FAQ item' })
  @ApiNotFoundResponse({ description: 'FAQ item not found' })
  updateFaqItem(
    @Param('id') id: string,
    @Body() dto: UpdateFaqItemDto,
  ): Promise<FaqItemResponseDto> {
    return this.siteContent.updateFaqItem(id, dto);
  }

  @Delete('faq/items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a FAQ item' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'FAQ item not found' })
  removeFaqItem(@Param('id') id: string): Promise<void> {
    return this.siteContent.removeFaqItem(id);
  }

  // --- Content blocks --------------------------------------------------------------

  @Get('content')
  @ApiOperation({ summary: 'List all static content blocks' })
  @ApiOkResponse({ type: ContentBlockResponseDto, isArray: true })
  listContent(): Promise<ContentBlockResponseDto[]> {
    return this.siteContent.listContent();
  }

  @Get('content/:key')
  @ApiOperation({ summary: 'Get a single content block by key' })
  @ApiOkResponse({ type: ContentBlockResponseDto })
  @ApiNotFoundResponse({ description: 'No content block for that key' })
  getContent(@Param('key') key: string): Promise<ContentBlockResponseDto> {
    return this.siteContent.getContent(key);
  }

  @Put('content/:key')
  @ApiOperation({ summary: 'Create or replace a content block by key' })
  @ApiOkResponse({ type: ContentBlockResponseDto })
  upsertContent(
    @Param('key') key: string,
    @Body() dto: UpsertContentBlockDto,
  ): Promise<ContentBlockResponseDto> {
    return this.siteContent.upsertContent(key, dto);
  }

  @Delete('content/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a content block by key' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'No content block for that key' })
  removeContent(@Param('key') key: string): Promise<void> {
    return this.siteContent.removeContent(key);
  }

  // --- Contact inbox ---------------------------------------------------------------

  @Get('contact')
  @ApiOperation({ summary: 'List contact messages (paginated, newest first)' })
  @ApiOkResponse({ type: PaginatedContactMessagesDto })
  listMessages(@Query() query: AdminContactQueryDto): Promise<PaginatedContactMessagesDto> {
    return this.siteContent.listMessages(query);
  }

  @Patch('contact/:id')
  @ApiOperation({ summary: 'Mark a contact message handled / unhandled' })
  @ApiOkResponse({ type: ContactMessageResponseDto })
  @ApiNotFoundResponse({ description: 'Contact message not found' })
  markHandled(
    @Param('id') id: string,
    @Body() dto: MarkHandledDto,
  ): Promise<ContactMessageResponseDto> {
    return this.siteContent.markHandled(id, dto.handled);
  }

  @Delete('contact/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact message' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Contact message not found' })
  removeMessage(@Param('id') id: string): Promise<void> {
    return this.siteContent.removeMessage(id);
  }
}
