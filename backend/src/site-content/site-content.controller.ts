import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ContactMessageDto } from './dto/contact-message.dto';
import { ContactAcknowledgementDto } from './dto/contact-message-response.dto';
import { ContentBlockResponseDto } from './dto/content-block-response.dto';
import { FaqCategoryResponseDto } from './dto/faq-response.dto';
import { SiteContentService } from './site-content.service';

@ApiTags('content')
@Public() // FAQ, static pages and the contact/newsletter intake are all open to anonymous visitors
@Controller()
export class SiteContentController {
  constructor(private readonly siteContent: SiteContentService) {}

  @Get('faq')
  @ApiOperation({ summary: 'Get the FAQ grouped by category (public)' })
  @ApiOkResponse({ type: FaqCategoryResponseDto, isArray: true })
  getFaq(): Promise<FaqCategoryResponseDto[]> {
    return this.siteContent.getFaq();
  }

  @Get('content/:key')
  @ApiOperation({ summary: 'Get a static content block by key, e.g. about / privacy (public)' })
  @ApiOkResponse({ type: ContentBlockResponseDto })
  @ApiNotFoundResponse({ description: 'No content block for that key' })
  getContent(@Param('key') key: string): Promise<ContentBlockResponseDto> {
    return this.siteContent.getContent(key);
  }

  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a contact-form or newsletter message (public)',
    description:
      'Stores a real ContactMessage and returns a generic acknowledgement. Used by both the ' +
      'storefront contact form and the footer newsletter signup.',
  })
  @ApiCreatedResponse({ type: ContactAcknowledgementDto })
  submitContact(@Body() dto: ContactMessageDto): Promise<ContactAcknowledgementDto> {
    return this.siteContent.submit(dto);
  }
}
