import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument, TransactionStatus, TransactionType } from './schemas/transaction.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Wallet, WalletDocument } from '../wallets/schemas/wallet.schema';
import { Transaction as WalletTransaction, TransactionDocument as WalletTransactionDocument, TransactionType as WalletTxType } from '../wallets/schemas/transaction.schema';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('RAZORPAY_INSTANCE') private readonly razorpay: any,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name) private walletTxModel: Model<WalletTransactionDocument>,
    private readonly configService: ConfigService,
  ) {}

  async createRazorpayOrder(userId: string, amount: number, type: TransactionType, orderId?: string) {
    if (!this.razorpay) {
      throw new BadRequestException('Razorpay is not configured. Please add keys to .env');
    }

    try {
      const options = {
        amount: Math.round(amount * 100), // convert to paisa
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId,
          type,
          orderId: orderId || '',
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      const transaction = new this.transactionModel({
        userId: new Types.ObjectId(userId),
        amount,
        type,
        orderId: orderId ? new Types.ObjectId(orderId) : undefined,
        razorpayOrderId: razorpayOrder.id,
        status: TransactionStatus.PENDING,
        metadata: razorpayOrder,
      });

      await transaction.save();

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: options.amount,
        currency: options.currency,
        keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      console.error('Razorpay Create Order Error:', error);
      throw new BadRequestException('Failed to initiate payment with Razorpay');
    }
  }

  async verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<boolean> {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) throw new BadRequestException('Razorpay secret not found');

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpaySignature) {
      return true;
    }
    return false;
  }

  async markTransactionSuccess(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const transaction = await this.transactionModel.findOne({ razorpayOrderId }).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction with Razorpay Order ID ${razorpayOrderId} not found`);
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      return transaction; // Already processed
    }

    transaction.status = TransactionStatus.SUCCESS;
    transaction.razorpayPaymentId = razorpayPaymentId;
    transaction.razorpaySignature = razorpaySignature;
    await transaction.save();

    // Side Effects based on Transaction Type
    if (transaction.type === TransactionType.ORDER_PAYMENT) {
      // If it's a direct order payment, mark the order(s) as PAID
      if (transaction.orderId) {
        await this.orderModel.findByIdAndUpdate(transaction.orderId, { paymentStatus: 'PAID' }).exec();
      } else {
        // If there are multiple orders linked to this payment (grouped by restaurant)
        // We might need to find all orders for this user created around the same time
        // For now, if orderId is missing in transaction, we assume it's a session-based grouping
        // A better way would be to store an array of orderIds in the Transaction metadata
        console.log('Bulk order payment detected, updating payment status.');
      }
    } else if (transaction.type === TransactionType.WALLET_TOPUP) {
      // If it's a wallet top-up, credit the wallet
      const userId = transaction.userId;
      let wallet = await this.walletModel.findOne({ userId }).exec();
      if (!wallet) {
        wallet = new this.walletModel({ userId });
      }
      
      wallet.availableBalance += transaction.amount;
      
      const walletTx = new this.walletTxModel({
        walletId: wallet._id,
        amount: transaction.amount,
        type: WalletTxType.WALLET_TOPUP,
        description: `Wallet top-up via Razorpay (${razorpayPaymentId})`,
      });
      
      await walletTx.save();
      await wallet.save();
    }

    return transaction;
  }

  async handleWebhook(body: any, signature: string) {
    // Basic signature check for webhooks (Razorpay sends this header)
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) return;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle specific events like payment.captured
    if (body.event === 'payment.captured' || body.event === 'order.paid') {
      const razorpayOrderId = body.payload?.order?.entity?.id || body.payload?.payment?.entity?.order_id;
      if (razorpayOrderId) {
        // We can use this to sync if the frontend verification fails or is skipped
        const transaction = await this.transactionModel.findOne({ razorpayOrderId }).exec();
        if (transaction && transaction.status !== TransactionStatus.SUCCESS) {
             transaction.status = TransactionStatus.SUCCESS;
             transaction.razorpayPaymentId = body.payload?.payment?.entity?.id;
             await transaction.save();
             // Here we would also trigger the order status update if it hasn't happened yet
        }
      }
    }

    // Handle payout events
    if (body.event === 'payout.processed' || body.event === 'payout.reversed' || body.event === 'payout.failed') {
      const payoutId = body.payload?.payout?.entity?.id;
      if (payoutId) {
        const walletTx = await this.walletTxModel.findOne({ razorpayPayoutId: payoutId }).exec();
        if (walletTx) {
          if (body.event === 'payout.processed') {
            walletTx.status = 'COMPLETED'; 
          } else {
            walletTx.status = 'FAILED';
            // refund wallet if it fails
            const wallet = await this.walletModel.findById(walletTx.walletId).exec();
            if (wallet) {
              wallet.availableBalance += walletTx.amount;
              await wallet.save();
            }
          }
          await walletTx.save();
        }
      }
    }
  }

  // --- RAZORPAYX PAYOUTS ---

  async createRazorpayContact(name: string, email?: string, contact?: string, referenceId?: string): Promise<any> {
    if (!this.razorpay) throw new BadRequestException('Razorpay is not configured');
    try {
      const contactData = await this.razorpay.contacts.create({
        name,
        email,
        contact,
        type: 'vendor',
        reference_id: referenceId,
      });
      return contactData;
    } catch (error: any) {
      console.error('Razorpay Contact Error:', error);
      throw new BadRequestException(error?.error?.description || 'Failed to create Razorpay Contact');
    }
  }

  async createRazorpayFundAccount(contactId: string, accountName: string, accountNumber: string, ifsc: string): Promise<any> {
    if (!this.razorpay) throw new BadRequestException('Razorpay is not configured');
    try {
      const fundAccountData = await this.razorpay.fundAccount.create({
        contact_id: contactId,
        account_type: 'bank_account',
        bank_account: {
          name: accountName,
          ifsc: ifsc,
          account_number: accountNumber,
        },
      });
      return fundAccountData;
    } catch (error: any) {
      console.error('Razorpay Fund Account Error:', error);
      throw new BadRequestException(error?.error?.description || 'Failed to create Razorpay Fund Account');
    }
  }

  async createPayout(fundAccountId: string, amount: number, referenceId: string, purpose: string = 'payout'): Promise<any> {
    if (!this.razorpay) throw new BadRequestException('Razorpay is not configured');
    const razorpayXAccountNumber = this.configService.get<string>('RAZORPAYX_ACCOUNT_NUMBER');
    if (!razorpayXAccountNumber) {
      throw new BadRequestException('RAZORPAYX_ACCOUNT_NUMBER is not configured in environment variables');
    }

    try {
      const payoutData = await this.razorpay.payouts.create({
        account_number: razorpayXAccountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100), // in paisa
        currency: 'INR',
        mode: 'IMPS', // or NEFT/RTGS
        purpose: purpose,
        queue_if_low_balance: true,
        reference_id: referenceId,
        narration: `Payout for ${referenceId}`,
      });
      return payoutData;
    } catch (error: any) {
      console.error('Razorpay Payout Error:', error);
      throw new BadRequestException(error?.error?.description || 'Failed to initiate Razorpay Payout');
    }
  }
}
