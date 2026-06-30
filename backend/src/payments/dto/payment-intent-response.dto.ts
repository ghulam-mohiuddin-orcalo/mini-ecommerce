import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty({ description: 'Client secret used to confirm the PaymentIntent with Stripe.js' })
  clientSecret!: string;

  @ApiProperty({ description: 'Stripe PaymentIntent id (also the order idempotency key)' })
  paymentIntentId!: string;

  @ApiProperty({ description: 'Authoritative amount to charge, in minor units (cents)' })
  amountCents!: number;
}
