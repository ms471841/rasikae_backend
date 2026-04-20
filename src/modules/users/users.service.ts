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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
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
}
