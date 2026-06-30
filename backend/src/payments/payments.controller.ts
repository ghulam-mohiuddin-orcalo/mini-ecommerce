import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PaymentsService } from './payments.service';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { SessionStatusResponseDto } from './dto/session-status-response.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout-session')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout Session from the current cart' })
  @ApiCreatedResponse({ type: CheckoutSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Cart is empty' })
  createCheckoutSession(@CurrentUser() user: AuthenticatedUser): Promise<CheckoutSessionResponseDto> {
    return this.payments.createCheckoutSession(user.id);
  }

  @Get('checkout-session/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Reconcile a Checkout Session and return its order once fulfilled' })
  @ApiOkResponse({ type: SessionStatusResponseDto })
  getSessionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SessionStatusResponseDto> {
    return this.payments.getSessionStatus(user.id, id);
  }

  @Post('payment-intent')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent from the current cart (embedded checkout)' })
  @ApiCreatedResponse({ type: PaymentIntentResponseDto })
  @ApiBadRequestResponse({ description: 'Cart is empty' })
  createPaymentIntent(@CurrentUser() user: AuthenticatedUser): Promise<PaymentIntentResponseDto> {
    return this.payments.createPaymentIntent(user.id);
  }

  @Get('payment-intent/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Reconcile a PaymentIntent and return its order once fulfilled' })
  @ApiOkResponse({ type: SessionStatusResponseDto })
  getPaymentIntentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SessionStatusResponseDto> {
    return this.payments.getPaymentIntentStatus(user.id, id);
  }

  /**
   * Stripe webhook. PUBLIC (Stripe calls it server-to-server, no cookie) and verified by
   * signature against the raw request body. Always returns 200 on a handled/acknowledged event;
   * an invalid signature returns 400 and is never processed.
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    if (!req.rawBody) {
      // rawBody is enabled in main.ts (NestFactory { rawBody: true }); guard for safety.
      throw new BadRequestException('Missing raw request body for signature verification');
    }
    await this.payments.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
