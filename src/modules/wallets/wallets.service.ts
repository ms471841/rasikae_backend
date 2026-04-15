import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { Transaction, TransactionDocument, TransactionType } from './schemas/transaction.schema';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async initializeWallet(userId: string): Promise<WalletDocument> {
    const existing = await this.walletModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (existing) return existing;

    const newWallet = new this.walletModel({
      userId: new Types.ObjectId(userId),
    });
    return newWallet.save();
  }

  async getWalletByUser(userId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!wallet) return this.initializeWallet(userId);
    return wallet;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    const wallet = await this.getWalletByUser(userId);
    return this.transactionModel.find({ walletId: wallet._id }).sort({ createdAt: -1 }).exec();
  }

  async initializeRestaurantWallet(restaurantId: string): Promise<WalletDocument> {
    const existing = await this.walletModel.findOne({ restaurantId: new Types.ObjectId(restaurantId) }).exec();
    if (existing) return existing;

    const newWallet = new this.walletModel({
      walletType: 'RESTAURANT',
      restaurantId: new Types.ObjectId(restaurantId),
    });
    return newWallet.save();
  }

  async getWalletByRestaurant(restaurantId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({ restaurantId: new Types.ObjectId(restaurantId) }).exec();
    if (!wallet) return this.initializeRestaurantWallet(restaurantId);
    return wallet;
  }

  async getTransactionsByRestaurant(restaurantId: string): Promise<Transaction[]> {
    const wallet = await this.getWalletByRestaurant(restaurantId);
    return this.transactionModel.find({ walletId: wallet._id }).sort({ createdAt: -1 }).exec();
  }

  async processDeliveryEarnings(userId: string, orderId: string, deliveryFee: number, totalAmountCollected: number, paymentMethod: string): Promise<void> {
    const wallet = await this.getWalletByUser(userId);

    // Earnings injection
    wallet.availableBalance += deliveryFee;
    wallet.totalEarned += deliveryFee;

    const earningTxData = {
      walletId: wallet._id as Types.ObjectId,
      orderId: new Types.ObjectId(orderId),
      amount: deliveryFee,
      type: TransactionType.DELIVERY_EARNING,
      description: `Delivery fee earned for Order ${orderId}`,
    };
    await new this.transactionModel(earningTxData).save();

    // COD injection
    if (paymentMethod === 'COD') {
      wallet.cashInHand += totalAmountCollected;

      const codTxData = {
        walletId: wallet._id as Types.ObjectId,
        orderId: new Types.ObjectId(orderId),
        amount: totalAmountCollected,
        type: TransactionType.CASH_COLLECTED,
        description: `Cash collected for COD Order ${orderId}`,
      };
      await new this.transactionModel(codTxData).save();
    }

    await wallet.save();
  }

  async processRestaurantEarnings(restaurantId: string, orderId: string, subTotal: number): Promise<void> {
    const wallet = await this.getWalletByRestaurant(restaurantId);

    // Platform Commission logic (Static 10%)
    const platformCommission = Math.round(subTotal * 0.10);
    const finalRestaurantEarning = subTotal - platformCommission;

    wallet.availableBalance += finalRestaurantEarning;
    wallet.totalEarned += finalRestaurantEarning;

    // Log the earning
    const earningTxData = {
      walletId: wallet._id as Types.ObjectId,
      orderId: new Types.ObjectId(orderId),
      amount: finalRestaurantEarning,
      type: TransactionType.RESTAURANT_EARNING,
      description: `Revenue from Order ${orderId}`,
    };
    await new this.transactionModel(earningTxData).save();

    // Log the commission mathematically
    const commissionTxData = {
      walletId: wallet._id as Types.ObjectId,
      orderId: new Types.ObjectId(orderId),
      amount: platformCommission,
      type: TransactionType.PLATFORM_COMMISSION,
      description: `10% Platform Commission deducted for Order ${orderId}`,
    };
    await new this.transactionModel(commissionTxData).save();

    await wallet.save();
  }

  async creditWallet(userId: string, amount: number, description: string): Promise<void> {
    const wallet = await this.getWalletByUser(userId);
    wallet.availableBalance += amount;
    
    const txData = {
      walletId: wallet._id as Types.ObjectId,
      amount: amount,
      type: 'WALLET_TOPUP', // We can update the Enum to include this
      description: description,
    };
    await new this.transactionModel(txData).save();
    await wallet.save();
  }

  async requestWithdrawal(restaurantId: string, withdrawDto: WithdrawDto): Promise<WalletDocument> {
    const { amount, description } = withdrawDto;
    const wallet = await this.getWalletByRestaurant(restaurantId);

    if (wallet.availableBalance < amount) {
      throw new BadRequestException('Insufficient balance in wallet.');
    }

    // Deduct balance
    wallet.availableBalance -= amount;

    // Create transaction log
    const txData = {
      walletId: wallet._id as Types.ObjectId,
      amount: amount,
      type: TransactionType.WITHDRAWAL,
      description: description || `Withdrawal request for restaurant ${restaurantId}`,
    };

    await new this.transactionModel(txData).save();
    return wallet.save();
  }
}
