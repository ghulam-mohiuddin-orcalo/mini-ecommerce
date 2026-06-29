import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionResponseDto {
  @ApiProperty({ description: 'Stripe Checkout Session id' })
  id!: string;

  @ApiProperty({ description: 'Stripe-hosted Checkout URL to redirect the customer to' })
  url!: string;
}
