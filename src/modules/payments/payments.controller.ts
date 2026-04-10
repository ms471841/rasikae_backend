import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { TransactionType } from './schemas/transaction.schema';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
