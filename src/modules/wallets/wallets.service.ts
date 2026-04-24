import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { Transaction, TransactionDocument, TransactionType } from './schemas/transaction.schema';
import { WithdrawDto } from './dto/withdraw.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private readonly settingsService: SettingsService,
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
  
  async getPlatformWallet(): Promise<WalletDocument> {
    const wallet = await this.walletModel.findOne({ walletType: 'PLATFORM' }).exec();
    if (wallet) return wallet;
    
    const newWallet = new this.walletModel({
      walletType: 'PLATFORM',
    });
    return newWallet.save();
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

  async processRestaurantEarnings(restaurantId: string, orderId: string, subTotal: number, tax: number = 0, cgst: number = 0, sgst: number = 0): Promise<void> {
    const wallet = await this.getWalletByRestaurant(restaurantId);
    const settings = await this.settingsService.getSettings();

    // Platform Commission logic (Dynamic from Settings)
    const commissionRate = settings.platformCommissionPercentage || 0.10;
    const platformCommission = Math.round(subTotal * commissionRate);
    const finalRestaurantEarning = subTotal - platformCommission;

    wallet.availableBalance += finalRestaurantEarning;
    wallet.totalEarned += finalRestaurantEarning;

    // Platform Balance Injection (Commission + Taxes)
    const platformWallet = await this.getPlatformWallet();
    const totalPlatformInjection = platformCommission + tax; // We assume the platform holds the tax for filing
    
    platformWallet.availableBalance += totalPlatformInjection;
    platformWallet.totalEarned += totalPlatformInjection;
    await platformWallet.save();

    // Log the restaurant earning
    const earningTxData = {
      walletId: wallet._id as Types.ObjectId,
      orderId: new Types.ObjectId(orderId),
      amount: finalRestaurantEarning,
      type: TransactionType.RESTAURANT_EARNING,
      description: `Revenue from Order ${orderId}`,
    };
    await new this.transactionModel(earningTxData).save();

    // Log the platform revenue (Commission)
    const commissionTxData = {
      walletId: platformWallet._id as Types.ObjectId,
      orderId: new Types.ObjectId(orderId),
      amount: platformCommission,
      type: TransactionType.PLATFORM_COMMISSION,
      description: `${(commissionRate * 100).toFixed(1)}% Platform Commission from Order ${orderId}`,
    };
    await new this.transactionModel(commissionTxData).save();

    // Log the platform tax collection (Split into CGST & SGST)
    if (cgst > 0) {
      await new this.transactionModel({
        walletId: platformWallet._id as Types.ObjectId,
        orderId: new Types.ObjectId(orderId),
        amount: cgst,
        type: TransactionType.CGST_COLLECTED,
        description: `CGST (2.5%) Collected for Order ${orderId}`,
      }).save();
    }
    if (sgst > 0) {
      await new this.transactionModel({
        walletId: platformWallet._id as Types.ObjectId,
        orderId: new Types.ObjectId(orderId),
        amount: sgst,
        type: TransactionType.SGST_COLLECTED,
        description: `SGST (2.5%) Collected for Order ${orderId}`,
      }).save();
    }
    
    // Legacy support: also log total tax if cgst/sgst are not provided but tax is
    if (tax > 0 && cgst === 0 && sgst === 0) {
      await new this.transactionModel({
        walletId: platformWallet._id as Types.ObjectId,
        orderId: new Types.ObjectId(orderId),
        amount: tax,
        type: TransactionType.TAX_COLLECTED,
        description: `Tax Collected (Total) for Order ${orderId}`,
      }).save();
    }

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

  async findAllWallets(): Promise<Wallet[]> {
    return this.walletModel.find()
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name address')
      .sort({ availableBalance: -1 })
      .exec();
  }

  async findAllTransactions(): Promise<Transaction[]> {
    return this.transactionModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async settleWallet(walletId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findById(walletId).exec();
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.availableBalance <= 0) {
      return wallet;
    }

    const amountToSettle = wallet.availableBalance;

    // Deduct the full amount
    wallet.availableBalance = 0;

    // Create withdrawal transaction record
    const withdrawalTx = new this.transactionModel({
      walletId: wallet._id,
      amount: amountToSettle,
      type: TransactionType.WITHDRAWAL,
      description: `Manual Settlement: Admin Payout`,
      createdAt: new Date(),
    });

    await withdrawalTx.save();
    return wallet.save();
  }

  async findTransactionsByWallet(walletId: string): Promise<Transaction[]> {
    return this.transactionModel.find({ walletId: new Types.ObjectId(walletId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async settleBatch(walletIds: string[]): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const id of walletIds) {
      try {
        await this.settleWallet(id);
        success.push(id);
      } catch (error) {
        console.error(`Failed to settle wallet ${id}:`, error);
        failed.push(id);
      }
    }

    return { success, failed };
  }
}
