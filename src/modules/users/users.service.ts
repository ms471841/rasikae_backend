import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateFcmTokenDto, FcmAction } from './dto/update-fcm-token.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}
