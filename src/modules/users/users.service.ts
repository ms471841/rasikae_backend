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
import { Vendor, VendorDocument } from '../vendors/schemas/vendor.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
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

      // If new user is a vendor, initialize vendor profile
      if (user.role === 'vendor') {
        await this.initializeVendorProfile(user);
      }
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

  async updateFcmToken(uid: string, dto: UpdateFcmTokenDto): Promise<User> {
    const { token, action } = dto;
    
    let updateQuery;
    if (action === FcmAction.ADD) {
      updateQuery = { $addToSet: { fcmTokens: token } };
    } else {
      updateQuery = { $pull: { fcmTokens: token } };
    }

    const filter = Types.ObjectId.isValid(uid) 
      ? { $or: [{ _id: new Types.ObjectId(uid) }, { firebaseUid: uid }] }
      : { firebaseUid: uid };

    const user = await this.userModel.findOneAndUpdate(
      filter,
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

  async findAllAdmin(page: number = 1, limit: number = 20, search?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.userModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec()
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
    const user = await this.userModel.findOneAndUpdate(
      { $or: [{ _id: new Types.ObjectId(uid) }, { firebaseUid: uid }] },
      { $set: { role } },
      { returnDocument: 'after' }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If role changed to vendor, ensure vendor profile exists
    if (role === 'vendor') {
      await this.initializeVendorProfile(user);
    }

    return user;
  }

  private async initializeVendorProfile(user: UserDocument) {
    const existingVendor = await this.vendorModel.findOne({ userId: user._id }).exec();
    if (!existingVendor) {
      await new this.vendorModel({
        userId: user._id,
        businessName: `${user.name}'s Business`,
        verificationStatus: 'PENDING',
      }).save();
    }
  }
  
  async toggleUserActive(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.isActive = !user.isActive;
    
    // Sync with Firebase Auth
    try {
      await admin.auth().updateUser(user.firebaseUid, {
        disabled: !user.isActive
      });
    } catch (err) {
      console.error('Firebase Auth sync failed:', err);
      // We continue even if firebase fails, but the database will be out of sync.
      // Ideally we should handle this, but for now we'll just log it.
    }
    
    return user.save();
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

  async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(query, 'i');
    const filter = {
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    };

    const [data, totalItems] = await Promise.all([
      this.userModel.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec()
    ]);

    return {
      data,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page
    };
  }
}
