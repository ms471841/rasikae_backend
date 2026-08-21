import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import { Vendor, VendorDocument } from './schemas/vendor.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(FIREBASE_APP) private firebaseApp: admin.app.App,
  ) {}

  async createVendor(data: {
    name: string;
    email: string;
    phone: string;
    businessName: string;
    gstNumber?: string;
    fssaiNumber?: string;
  }): Promise<any> {
    const { name, email, phone, businessName, gstNumber, fssaiNumber } = data;

    // 1. Check if user already exists
    const existingUser = await this.userModel
      .findOne({ $or: [{ email }, { phone }] })
      .exec();
    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    // 2. Create Firebase User
    let firebaseUser;
    try {
      firebaseUser = await this.firebaseApp.auth().createUser({
        email,
        phoneNumber: phone,
        displayName: name,
        password: 'TemporaryPassword123!', // Admin can reset or user can use forgot password
        emailVerified: true,
      });
    } catch (err) {
      throw new ConflictException('Firebase creation failed: ' + err.message);
    }

    // 3. Create MongoDB User
    const user = new this.userModel({
      firebaseUid: firebaseUser.uid,
      name,
      email,
      phone,
      role: 'vendor',
      isActive: true,
    });
    await user.save();

    // 4. Create Vendor Profile
    const vendor = new this.vendorModel({
      userId: user._id,
      businessName,
      gstNumber,
      fssaiNumber,
      verificationStatus: 'VERIFIED', // Since admin is creating it, we can auto-verify or leave as PENDING
    });
    await vendor.save();

    return { user, vendor };
  }

  async findAll(page = 1, limit = 20, search = ''): Promise<any> {
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { businessName: { $regex: search, $options: 'i' } },
          { fssaiNumber: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const vendors = await this.vendorModel
      .find(query)
      .populate('userId', 'name email phone avatarUrl')
      .populate('restaurants', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.vendorModel.countDocuments(query);

    return {
      vendors,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorModel
      .findById(id)
      .populate('userId')
      .populate('restaurants')
      .exec();

    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async updateStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<Vendor> {
    const vendor = await this.vendorModel
      .findByIdAndUpdate(
        id,
        { verificationStatus: status, rejectionReason: reason },
        { new: true },
      )
      .exec();

    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async toggleActive(id: string): Promise<Vendor> {
    const vendor = await this.vendorModel.findById(id);
    if (!vendor) throw new NotFoundException('Vendor not found');

    vendor.isActive = !vendor.isActive;
    return vendor.save();
  }
}
