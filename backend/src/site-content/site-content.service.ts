import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminContactQueryDto } from './dto/admin-contact-query.dto';
import { ContactMessageDto } from './dto/contact-message.dto';
import {
  ContactAcknowledgementDto,
  ContactMessageResponseDto,
  PaginatedContactMessagesDto,
  toContactMessageResponse,
} from './dto/contact-message-response.dto';
import {
  ContentBlockResponseDto,
  toContentBlockResponse,
} from './dto/content-block-response.dto';
import { CreateFaqCategoryDto, UpdateFaqCategoryDto } from './dto/create-faq-category.dto';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/create-faq-item.dto';
import {
  FaqCategoryResponseDto,
  FaqItemResponseDto,
  toFaqCategoryResponse,
  toFaqItemResponse,
} from './dto/faq-response.dto';
import { UpsertContentBlockDto } from './dto/upsert-content-block.dto';

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  // --- FAQ (public) ----------------------------------------------------------------

  /**
   * Public FAQ: every category in display order, each with its items in display order. The
   * nested ordered include keeps this a single round trip and returns the grouped shape the
   * storefront renders directly.
   */
  async getFaq(): Promise<FaqCategoryResponseDto[]> {
    const categories = await this.prisma.faqCategory.findMany({
      orderBy: { position: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return categories.map(toFaqCategoryResponse);
  }

  // --- FAQ (admin) -----------------------------------------------------------------

  /** Create a FAQ category. Slug defaults to a slugified name; duplicate slug -> P2002 -> 409. */
  async createFaqCategory(dto: CreateFaqCategoryDto): Promise<FaqCategoryResponseDto> {
    const category = await this.prisma.faqCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug ?? this.slugify(dto.name),
        position: dto.position ?? 0,
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return toFaqCategoryResponse(category);
  }

  /** Patch a FAQ category (rename / re-slug / reorder). 404 if missing. */
  async updateFaqCategory(
    id: string,
    dto: UpdateFaqCategoryDto,
  ): Promise<FaqCategoryResponseDto> {
    await this.ensureFaqCategoryExists(id);
    const category = await this.prisma.faqCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return toFaqCategoryResponse(category);
  }

  /** Delete a FAQ category. Items cascade away (schema onDelete: Cascade). 404 if missing. */
  async removeFaqCategory(id: string): Promise<void> {
    await this.ensureFaqCategoryExists(id);
    await this.prisma.faqCategory.delete({ where: { id } });
  }

  /** Create a FAQ item under a category. Unknown category -> P2003 -> 409 via the global filter. */
  async createFaqItem(dto: CreateFaqItemDto): Promise<FaqItemResponseDto> {
    await this.ensureFaqCategoryExists(dto.categoryId);
    const item = await this.prisma.faqItem.create({
      data: {
        categoryId: dto.categoryId,
        question: dto.question,
        body: dto.body,
        position: dto.position ?? 0,
      },
    });
    return toFaqItemResponse(item);
  }

  /** Patch a FAQ item (edit text, move category, reorder). 404 if missing. */
  async updateFaqItem(id: string, dto: UpdateFaqItemDto): Promise<FaqItemResponseDto> {
    await this.ensureFaqItemExists(id);
    if (dto.categoryId !== undefined) {
      await this.ensureFaqCategoryExists(dto.categoryId);
    }
    const item = await this.prisma.faqItem.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.question !== undefined ? { question: dto.question } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });
    return toFaqItemResponse(item);
  }

  /** Delete a FAQ item. 404 if missing. */
  async removeFaqItem(id: string): Promise<void> {
    await this.ensureFaqItemExists(id);
    await this.prisma.faqItem.delete({ where: { id } });
  }

  // --- Content blocks --------------------------------------------------------------

  /** Public read of a single static block by its key, or 404. */
  async getContent(key: string): Promise<ContentBlockResponseDto> {
    const block = await this.prisma.contentBlock.findUnique({ where: { key } });
    if (!block) {
      throw new NotFoundException('Content not found');
    }
    return toContentBlockResponse(block);
  }

  /** Admin listing of every content block (newest-updated first). */
  async listContent(): Promise<ContentBlockResponseDto[]> {
    const blocks = await this.prisma.contentBlock.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return blocks.map(toContentBlockResponse);
  }

  /** Create or replace a content block by its key (idempotent admin upsert). */
  async upsertContent(key: string, dto: UpsertContentBlockDto): Promise<ContentBlockResponseDto> {
    const block = await this.prisma.contentBlock.upsert({
      where: { key },
      create: { key, title: dto.title, body: dto.body },
      update: { title: dto.title, body: dto.body },
    });
    return toContentBlockResponse(block);
  }

  /** Delete a content block by key. 404 if missing. */
  async removeContent(key: string): Promise<void> {
    const block = await this.prisma.contentBlock.findUnique({
      where: { key },
      select: { key: true },
    });
    if (!block) {
      throw new NotFoundException('Content not found');
    }
    await this.prisma.contentBlock.delete({ where: { key } });
  }

  // --- Contact messages ------------------------------------------------------------

  /**
   * Public submit (contact form + footer newsletter). Always persists a real ContactMessage and
   * returns a generic acknowledgement — no id or stored state is echoed to the anonymous caller.
   */
  async submit(dto: ContactMessageDto): Promise<ContactAcknowledgementDto> {
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        body: dto.body,
      },
    });
    return {
      received: true,
      message: 'Thanks — we received your message and will get back to you.',
    };
  }

  /** Admin inbox: paginated, newest first, optionally filtered by handled flag. */
  async listMessages(query: AdminContactQueryDto): Promise<PaginatedContactMessagesDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ContactMessageWhereInput =
      query.handled !== undefined ? { handled: query.handled === 'true' } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return {
      data: items.map(toContactMessageResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** Flag a contact message handled / unhandled. 404 if missing. */
  async markHandled(id: string, handled: boolean): Promise<ContactMessageResponseDto> {
    await this.ensureContactMessageExists(id);
    const message = await this.prisma.contactMessage.update({
      where: { id },
      data: { handled },
    });
    return toContactMessageResponse(message);
  }

  /** Delete a contact message. 404 if missing. */
  async removeMessage(id: string): Promise<void> {
    await this.ensureContactMessageExists(id);
    await this.prisma.contactMessage.delete({ where: { id } });
  }

  // --- Helpers ---------------------------------------------------------------------

  private async ensureFaqCategoryExists(id: string): Promise<void> {
    const exists = await this.prisma.faqCategory.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('FAQ category not found');
    }
  }

  private async ensureFaqItemExists(id: string): Promise<void> {
    const exists = await this.prisma.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('FAQ item not found');
    }
  }

  private async ensureContactMessageExists(id: string): Promise<void> {
    const exists = await this.prisma.contactMessage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Contact message not found');
    }
  }

  /** Derive a URL slug from a display name (lowercase, hyphen-separated alphanumerics). */
  private slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
