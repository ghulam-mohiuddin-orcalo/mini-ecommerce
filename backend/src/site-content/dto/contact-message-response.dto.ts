import { ApiProperty } from '@nestjs/swagger';
import { ContactMessage } from '@prisma/client';

/** Admin inbox view of a contact message. */
export class ContactMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() body!: string;
  @ApiProperty() handled!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class PaginatedContactMessagesDto {
  @ApiProperty({ type: ContactMessageResponseDto, isArray: true })
  data!: ContactMessageResponseDto[];
  @ApiProperty()
  meta!: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Generic acknowledgement returned to the public after submitting a contact message — no id or
 * internal state is echoed back, so the endpoint can't be used to probe storage.
 */
export class ContactAcknowledgementDto {
  @ApiProperty({ example: true }) received!: boolean;
  @ApiProperty({ example: 'Thanks — we received your message and will get back to you.' })
  message!: string;
}

export function toContactMessageResponse(message: ContactMessage): ContactMessageResponseDto {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    subject: message.subject,
    body: message.body,
    handled: message.handled,
    createdAt: message.createdAt,
  };
}
