import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { BankAccount, BankAccountDocument } from './schemas/bank-account.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { WalletsService } from '../wallets/wallets.service';
import { Vendor, VendorDocument } from '../vendors/schemas/vendor.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(BankAccount.name) private bankAccountModel: Model<BankAccountDocument>,
    private readonly walletsService: WalletsService,
  ) {}

  async create(ownerId: string, createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const newRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      ownerId,
    });
    const savedRestaurant = await newRestaurant.save();
    
    // 1. Auto initiate wallet ledger
    await this.walletsService.initializeRestaurantWallet(savedRestaurant._id.toString());

    // 2. Link to Vendor Profile
    await this.vendorModel.updateOne(
      { userId: new mongoose.Types.ObjectId(ownerId) },
      { $addToSet: { restaurants: savedRestaurant._id } }
    ).exec();

    return savedRestaurant;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    lat?: number,
    lng?: number,
    filters: {
      search?: string;
      status?: string;
      isPublished?: boolean;
      minRating?: number;
      maxDistance?: number;
      isVeg?: boolean;
      cuisines?: string[];
      categoryId?: string;
      sortBy?: string;
      nearAndFast?: boolean;
      hasOffers?: boolean;
      maxPrice?: number;
    } = {}
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const baseMatch: any = {};

    // Apply dynamic filters
    if (filters.search) {
      baseMatch.name = { $regex: filters.search, $options: 'i' };
    }
    if (filters.status) baseMatch.status = filters.status;
    if (filters.isPublished !== undefined) baseMatch.isPublished = filters.isPublished;
    if (filters.minRating) baseMatch.rating = { $gte: filters.minRating };
    if (filters.isVeg === true) baseMatch.isVeg = true;
    if (filters.nearAndFast) {
      baseMatch.$or = [
        ...(baseMatch.$or || []),
        { deliveryTime: { $lte: 35 } }
      ];
    }
    if (filters.hasOffers) {
      baseMatch.isFreeDelivery = true;
    }
    if (filters.cuisines && filters.cuisines.length > 0) {
      const validObjectIds = filters.cuisines
        .filter(c => mongoose.Types.ObjectId.isValid(c))
        .map(c => new mongoose.Types.ObjectId(c));
      if (validObjectIds.length > 0) {
        baseMatch.cuisines = { $in: validObjectIds };
      }
    }
    if (filters.categoryId && mongoose.Types.ObjectId.isValid(filters.categoryId)) {
      baseMatch.categories = new mongoose.Types.ObjectId(filters.categoryId);
    }

    // Determine sort stage
    let sortStage: any = { rating: -1 };
    if (filters.sortBy === 'Rating') {
      sortStage = { rating: -1 };
    } else if (filters.sortBy === 'Time') {
      sortStage = { deliveryTime: 1 };
    } else if (filters.sortBy === 'Distance') {
      sortStage = { 'dist.calculated': 1 };
    }

    let data = [];
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      const effectiveMaxDistance = filters.nearAndFast ? 5000 : (filters.maxDistance || 1000000) * 1000;
      data = await this.restaurantModel.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'dist.calculated',
            maxDistance: effectiveMaxDistance,
            query: baseMatch,
            spherical: true
          }
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'categories', localField: 'categories', foreignField: '_id', as: 'categories' } },
        { $lookup: { from: 'cuisines', localField: 'cuisines', foreignField: '_id', as: 'cuisines' } }
      ]).exec();
    } else {
      data = await this.restaurantModel
        .find(baseMatch)
        .sort(sortStage)
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
    filters: {
      minRating?: number;
      maxDistance?: number;
      isVeg?: boolean;
      cuisines?: string[];
      categoryId?: string;
      sortBy?: string;
      nearAndFast?: boolean;
      hasOffers?: boolean;
      maxPrice?: number;
    } = {}
  ): Promise<any> {
    const baseMatch: any = { status: 'approved', isPublished: true };
    
    // Global filters for carousels
    if (filters.minRating) baseMatch.rating = { $gte: filters.minRating };
    if (filters.isVeg === true) baseMatch.isVeg = true;
    if (filters.nearAndFast) {
      baseMatch.deliveryTime = { $lte: 35 };
    }
    if (filters.hasOffers) {
      baseMatch.isFreeDelivery = true;
    }
    if (filters.cuisines && filters.cuisines.length > 0) {
      const validObjectIds = filters.cuisines
        .filter(c => mongoose.Types.ObjectId.isValid(c))
        .map(c => new mongoose.Types.ObjectId(c));
      if (validObjectIds.length > 0) {
        baseMatch.cuisines = { $in: validObjectIds };
      }
    }
    if (filters.categoryId && mongoose.Types.ObjectId.isValid(filters.categoryId)) {
      baseMatch.categories = new mongoose.Types.ObjectId(filters.categoryId);
    }

    // Helper for carousel fetching with distance
    const getCarouselData = async (sortPipe: any, additionalMatch: any = {}) => {
      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        return this.restaurantModel.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'dist.calculated',
              query: { ...baseMatch, ...additionalMatch },
              spherical: true
            }
          },
          { $sort: sortPipe },
          { $limit: 5 },
          { $lookup: { from: 'categories', localField: 'categories', foreignField: '_id', as: 'categories' } },
          { $lookup: { from: 'cuisines', localField: 'cuisines', foreignField: '_id', as: 'cuisines' } }
        ]).exec();
      } else {
        return this.restaurantModel
          .find({ ...baseMatch, ...additionalMatch })
          .populate('categories cuisines')
          .sort(sortPipe)
          .limit(5)
          .lean()
          .exec();
      }
    };

    const trendingPromise = getCarouselData({ rating: -1, ratingCount: -1 });
    const recommendedPromise = getCarouselData({ rating: -1 }, { $or: [{ isFeatured: true }, { isFreeDelivery: true }] });

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

  async update(id: string, updateRestaurantDto: UpdateRestaurantDto, currentUser?: any): Promise<Restaurant> {
    if (currentUser && currentUser.role !== 'admin') {
      const restaurant = await this.restaurantModel.findById(id).exec();
      if (!restaurant || restaurant.ownerId.toString() !== currentUser._id.toString()) {
        throw new ForbiddenException('You are not authorized to manage this restaurant');
      }
    }
    const existingRestaurant = await this.restaurantModel
      .findByIdAndUpdate(id, updateRestaurantDto, { returnDocument: 'after' })
      .exec();

    if (!existingRestaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return existingRestaurant;
  }

  async remove(id: string, currentUser?: any): Promise<Restaurant> {
    if (currentUser && currentUser.role !== 'admin') {
      const restaurant = await this.restaurantModel.findById(id).exec();
      if (!restaurant || restaurant.ownerId.toString() !== currentUser._id.toString()) {
        throw new ForbiddenException('You are not authorized to manage this restaurant');
      }
    }
    const deletedRestaurant = await this.restaurantModel.findByIdAndDelete(id).exec();
    
    if (!deletedRestaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return deletedRestaurant;
  }

  async getBankAccount(restaurantId: string, currentUser?: any): Promise<BankAccount> {
    if (currentUser && currentUser.role !== 'admin') {
      const restaurant = await this.restaurantModel.findById(restaurantId).exec();
      if (!restaurant || restaurant.ownerId.toString() !== currentUser._id.toString()) {
        throw new ForbiddenException('You are not authorized to access this restaurant bank account');
      }
    }
    const bankAccount = await this.bankAccountModel.findOne({ restaurantId: new mongoose.Types.ObjectId(restaurantId) }).exec();
    if (!bankAccount) {
      throw new NotFoundException(`Bank account for restaurant ${restaurantId} not found`);
    }
    return bankAccount;
  }

  async upsertBankAccount(restaurantId: string, data: any, currentUser?: any): Promise<BankAccount> {
    if (currentUser && currentUser.role !== 'admin') {
      const restaurant = await this.restaurantModel.findById(restaurantId).exec();
      if (!restaurant || restaurant.ownerId.toString() !== currentUser._id.toString()) {
        throw new ForbiddenException('You are not authorized to manage this restaurant bank account');
      }
    }
    const existing = await this.bankAccountModel.findOne({ restaurantId: new mongoose.Types.ObjectId(restaurantId) }).exec();
    if (existing) {
      Object.assign(existing, data);
      return existing.save();
    }
    const newAccount = new this.bankAccountModel({
      ...data,
      restaurantId: new mongoose.Types.ObjectId(restaurantId)
    });
    return newAccount.save();
  }
}
