import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

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
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Body() body: { 
      razorpayOrderId: string; 
      razorpayPaymentId: string; 
      razorpaySignature: string;
      userId: string;
    }
  ) {
    const isValid = await this.paymentsService.verifyPaymentSignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.paymentsService.markTransactionSuccess(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature
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
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
