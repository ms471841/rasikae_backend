import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    private readonly walletsService: WalletsService,
  ) {}

  async create(ownerId: string, createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const newRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      ownerId,
    });
    const savedRestaurant = await newRestaurant.save();
    
    // Auto initiate wallet ledger
    await this.walletsService.initializeRestaurantWallet(savedRestaurant._id.toString());

    return savedRestaurant;
  }

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.find().exec();
  }

  async findByOwner(ownerId: string): Promise<Restaurant[]> {
    return this.restaurantModel.find({ ownerId }).exec();
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return restaurant;
  }

  async update(id: string, updateRestaurantDto: UpdateRestaurantDto): Promise<Restaurant> {
    const existingRestaurant = await this.restaurantModel
      .findByIdAndUpdate(id, updateRestaurantDto, { new: true })
      .exec();

    if (!existingRestaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return existingRestaurant;
  }

  async remove(id: string): Promise<Restaurant> {
    const deletedRestaurant = await this.restaurantModel.findByIdAndDelete(id).exec();
    
    if (!deletedRestaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return deletedRestaurant;
  }
}
