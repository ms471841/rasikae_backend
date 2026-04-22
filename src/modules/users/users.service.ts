import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateFcmTokenDto, FcmAction } from './dto/update-fcm-token.dto';
import { Address, AddressDocument } from '../addresses/schemas/address.schema';
import { Cart, CartDocument } from '../carts/schemas/cart.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(FIREBASE_APP) private firebaseApp: admin.app.App,
  ) {}

  async syncUser(firebaseUid: string, dto: CreateUserDto, email?: string, phone?: string): Promise<User> {
    let user = await this.userModel.findOne({ firebaseUid }).exec();

    if (!user) {
      user = new this.userModel({
        firebaseUid,
        email,
        phone,
        ...dto,
      });
      await user.save();
    }
    
    return user;
  }

  async getProfile(firebaseUid: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ firebaseUid }).exec();
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  async updateProfile(firebaseUid: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { firebaseUid },
      { $set: dto },
      { returnDocument: 'after' },
    ).exec();
    
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  async updateFcmToken(firebaseUid: string, dto: UpdateFcmTokenDto): Promise<User> {
    const { token, action } = dto;
    
    let updateQuery;
    if (action === FcmAction.ADD) {
      updateQuery = { $addToSet: { fcmTokens: token } };
    } else {
      updateQuery = { $pull: { fcmTokens: token } };
    }

    const user = await this.userModel.findOneAndUpdate(
      { firebaseUid },
      updateQuery,
      { returnDocument: 'after' },
    ).exec();

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  async getTokens(userIds: string[]): Promise<string[]> {
    const users = await this.userModel.find({ 
      $or: [
        { _id: { $in: userIds } },
        { firebaseUid: { $in: userIds } }
      ]
    }).select('fcmTokens').exec();
    
    return users.flatMap(u => u.fcmTokens);
  }

  async deleteAccount(firebaseUid: string): Promise<void> {
    const user = await this.userModel.findOne({ firebaseUid }).exec();
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const userIdStr = user._id.toString();

    // 1. Delete associated data
    await Promise.all([
      this.addressModel.deleteMany({ userId: new Types.ObjectId(userIdStr) }).exec(),
      this.cartModel.findOneAndDelete({ userId: userIdStr }).exec(),
    ]);

    // 2. Delete from Firebase Auth
    try {
      await this.firebaseApp.auth().deleteUser(firebaseUid);
    } catch (error) {
      // If user doesn't exist in Firebase or other error, we still want to finish DB deletion
      console.error(`Error deleting Firebase user ${firebaseUid}:`, error);
    }

    // 3. Delete from MongoDB
    await this.userModel.deleteOne({ _id: user._id }).exec();
  }

  async createManual(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findAllAdmin(page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.userModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec()
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      totalItems,
      totalPages,
      currentPage: page
    };
  }

  async updateStatus(uid: string, role: string): Promise<User> {
    // Note: status is often handled by 'role' or a separate 'isBlocked' field.
    // Assuming for now it's a simple role toggle or we can add 'isBlocked' to schema if needed.
    // For this surprise, I'll update the profile.
    const user = await this.userModel.findOneAndUpdate(
      { $or: [{ _id: new Types.ObjectId(uid) }, { firebaseUid: uid }] },
      { $set: { role } },
      { returnDocument: 'after' }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async incrementUserStats(userId: string | Types.ObjectId, amountPaise: number): Promise<void> {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    await this.userModel.updateOne(
      { _id: id },
      { 
        $inc: { 
          totalOrders: 1, 
          ltv: amountPaise 
        },
        $set: { 
          lastOrderDate: new Date() 
        }
      }
    ).exec();
  }

  async syncAllUserStats(): Promise<any> {
    const aggregation = await this.orderModel.aggregate([
      { $match: { status: 'DELIVERED' } },
      {
        $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          ltv: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]).exec();

    const updates = aggregation.map(stats => 
      this.userModel.updateOne(
        { _id: stats._id },
        { 
          $set: { 
            totalOrders: stats.totalOrders,
            ltv: stats.ltv,
            lastOrderDate: stats.lastOrderDate
          } 
        }
      ).exec()
    );

    await Promise.all(updates);
    return { updatedCount: aggregation.length };
  }
}
