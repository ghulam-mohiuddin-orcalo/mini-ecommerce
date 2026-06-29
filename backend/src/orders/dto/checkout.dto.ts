import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional({
    description:
      'Mock payment token. Omit for a successful charge; send "tok_decline" to simulate a decline.',
    example: 'tok_test',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentToken?: string;
}
