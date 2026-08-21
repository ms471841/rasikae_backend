import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * PAYMENTS CONTROLLER
 * Handles Razorpay Payment Verification & Gateway Webhooks
 * ============================================================================
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Verify online payment signature from Razorpay SDK
   * POST /payments/verify
   */
  @Post('verify')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @CurrUser() user: any,
    @Body()
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      userId?: string;
    },
  ) {
    const isValid = await this.paymentsService.verifyPaymentSignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.paymentsService.markTransactionSuccess(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // 🌐 PAYMENT GATEWAY WEBHOOK APIs
  // --------------------------------------------------------------------------

  /**
   * [🌐 WEBHOOK] Razorpay automated payment status callback webhook
   * POST /payments/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: any,
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(
      req.rawBody || body,
      body,
      signature,
    );
  }
}
