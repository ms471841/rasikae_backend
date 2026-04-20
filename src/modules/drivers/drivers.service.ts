import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { CreateDriverDto } from './dto/create-driver.dto';
import { OnboardDriverDto } from './dto/onboard-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { WalletsService } from '../wallets/wallets.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @Inject(FIREBASE_APP) private firebaseApp: admin.app.App,
    private readonly walletsService: WalletsService,
    private readonly usersService: UsersService,
  ) {}

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    const existingDriver = await this.driverModel.findOne({ userId: createDriverDto.userId }).exec();
    if (existingDriver) {
      throw new BadRequestException('User is already registered as a driver');
    }

    const createdDriver = new this.driverModel(createDriverDto);
    await createdDriver.save();

    // Auto-init the wallet for the driver safely
    await this.walletsService.initializeWallet(createDriverDto.userId);

    return createdDriver;
  }

  async onboardDriver(dto: OnboardDriverDto): Promise<any> {
    const { name, email, password, phone, vehicleType, licensePlate } = dto;

    // 1. Firebase Auth Creation
    let firebaseUser;
    try {
      firebaseUser = await this.firebaseApp.auth().createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new BadRequestException('A user with this email already exists in Firebase.');
      }
      if (error.code === 'auth/phone-number-already-exists') {
        throw new BadRequestException('A user with this phone number already exists in Firebase.');
      }
      throw new BadRequestException(`Firebase Error: ${error.message}`);
    }

    // 2. Create User Document
    let user;
    try {
      user = await this.usersService.createManual({
        firebaseUid: firebaseUser.uid,
        name,
        email,
        phone,
        role: 'driver',
      });
    } catch (error) {
      // Rollback Firebase user if DB creation fails
      await this.firebaseApp.auth().deleteUser(firebaseUser.uid);
      throw error;
    }

    // 3. Create Driver Document
    let driver;
    try {
      driver = new this.driverModel({
        userId: user._id,
        vehicleType,
        licensePlate,
      });
      await driver.save();
    } catch (error) {
      // Rollback User and Firebase if Driver creation fails
      await this.firebaseApp.auth().deleteUser(firebaseUser.uid);
      // Note: We might want a deleteManual in UsersService too, but for now we proceed
      throw error;
    }

    // 4. Initialize Wallet
    await this.walletsService.initializeWallet(user._id.toString());

    return {
      message: 'Driver onboarded successfully',
      userId: user._id,
      driverId: driver._id,
      firebaseUid: firebaseUser.uid,
    };
  }

  async findAll(): Promise<Driver[]> {
    return this.driverModel.find().populate('userId', 'firstName lastName email phoneNumber').exec();
  }

  async findAvailable(): Promise<Driver[]> {
    return this.driverModel.find({ isAvailable: true }).populate('userId', 'firstName lastName phoneNumber').exec();
  }

  async findNearbyAvailable(lng: number, lat: number, maxDistance: number): Promise<Driver[]> {
    return this.driverModel.find({
      isAvailable: true,
      currentLocation: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: maxDistance
        }
      }
    }).populate('userId', 'firstName lastName phoneNumber').exec();
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.driverModel.findById(id).populate('userId', 'firstName lastName email phoneNumber').exec();
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    return driver;
  }

  async findByUserId(userId: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).exec();
    if (!driver) {
      throw new NotFoundException(`Driver profile not found for user ID ${userId}`);
    }
    return driver;
  }

  async updateStatus(id: string, updateDriverStatusDto: UpdateDriverStatusDto): Promise<Driver> {
    const driver = await this.driverModel.findByIdAndUpdate(
      id,
      { isAvailable: updateDriverStatusDto.isAvailable },
      { returnDocument: 'after' }
    ).exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    return driver;
  }

  async updateLocation(id: string, updateLocationDto: UpdateLocationDto): Promise<Driver> {
    const driver = await this.driverModel.findByIdAndUpdate(
      id,
      { 
        currentLocation: {
          type: 'Point',
          coordinates: updateLocationDto.coordinates
        }
      },
      { returnDocument: 'after' }
    ).exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    return driver;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<DriverDocument> {
    const user = await this.usersService.getProfile(firebaseUid);
    const driver = await this.driverModel.findOne({ userId: user._id }).exec();
    if (!driver) {
      throw new NotFoundException(`Driver profile not found for firebase UID ${firebaseUid}`);
    }
    return driver;
  }
}
