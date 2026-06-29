import { ApiProperty } from '@nestjs/swagger';

export type SessionStatus = 'complete' | 'pending' | 'expired';

export class SessionStatusResponseDto {
  @ApiProperty({
    enum: ['complete', 'pending', 'expired'],
    description:
      '`complete` — payment confirmed and order created; `pending` — paid event not processed yet; `expired` — session expired/cancelled.',
  })
  status!: SessionStatus;

  @ApiProperty({ nullable: true, description: 'Created order id once fulfilled, else null' })
  orderId!: string | null;
}
