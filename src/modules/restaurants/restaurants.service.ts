import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
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

  async findAll(
    page: number = 1,
    limit: number = 10,
    lat?: number,
    lng?: number,
    filters: { minRating?: number; maxDistance?: number; isVeg?: boolean; cuisines?: string[]; categoryId?: string } = {}
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const baseMatch: any = { status: 'approved', isPublished: true };

    // Apply dynamic filters
    if (filters.minRating) baseMatch.rating = { $gte: filters.minRating };
    if (filters.isVeg !== undefined) baseMatch.isVeg = filters.isVeg;
    if (filters.cuisines && filters.cuisines.length > 0) {
      baseMatch.cuisines = { $in: filters.cuisines.map(id => new mongoose.Types.ObjectId(id)) };
    }
    if (filters.categoryId) {
      baseMatch.categories = new mongoose.Types.ObjectId(filters.categoryId);
    }

    let data = [];
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      data = await this.restaurantModel.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'dist.calculated',
            maxDistance: (filters.maxDistance || 20) * 1000, // Default 20km, converted to meters
            query: baseMatch,
            spherical: true
          }
        },
        { $skip: skip },
        { $limit: limit }
      ]).exec();
    } else {
      data = await this.restaurantModel
        .find(baseMatch)
        .populate('categories cuisines')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
    }

    const totalItems = await this.restaurantModel.countDocuments(baseMatch).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      currentPage: page,
      totalPages,
      totalItems,
    };
  }

  async getHomeFeed(
    lat?: number,
    lng?: number,
    limit: number = 10,
    filters: { minRating?: number; maxDistance?: number; isVeg?: boolean; cuisines?: string[]; categoryId?: string } = {}
  ): Promise<any> {
    const baseMatch: any = { status: 'approved', isPublished: true };
    
    // Global filters for carousels
    if (filters.minRating) baseMatch.rating = { $gte: filters.minRating };
    if (filters.isVeg !== undefined) baseMatch.isVeg = filters.isVeg;
    if (filters.cuisines && filters.cuisines.length > 0) {
      baseMatch.cuisines = { $in: filters.cuisines.map(id => new mongoose.Types.ObjectId(id)) };
    }
    if (filters.categoryId) {
      baseMatch.categories = new mongoose.Types.ObjectId(filters.categoryId);
    }

    const trendingPromise = this.restaurantModel
      .find(baseMatch)
      .populate('categories cuisines')
      .sort({ rating: -1, ratingCount: -1 })
      .limit(5)
      .lean()
      .exec();

    const recommendedPromise = this.restaurantModel
      .find({ ...baseMatch, $or: [{ isFeatured: true }, { isFreeDelivery: true }] })
      .populate('categories cuisines')
      .sort({ rating: -1 })
      .limit(5)
      .lean()
      .exec();

    const [trending, recommended, allRestaurants] = await Promise.all([
      trendingPromise,
      recommendedPromise,
      this.findAll(1, limit, lat, lng, filters)
    ]);

    return {
      trending,
      recommended,
      allRestaurants
    };
  }

  async findByOwner(ownerId: string): Promise<Restaurant[]> {
    return this.restaurantModel.find({ ownerId }).populate('categories cuisines').exec();
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findById(id).populate('categories cuisines').exec();
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
