import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { WalletsService } from '../wallets/wallets.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
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
