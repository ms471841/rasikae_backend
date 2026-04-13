import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';

@Injectable()
export class FavouriteRestaurantsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async toggleFavorite(userId: string, restaurantId: string): Promise<string[]> {
    // 1. Verify restaurant exists
    const restaurant = await this.restaurantModel.findById(restaurantId).exec();
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // 2. Check if already in favorites
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isFavorite = user.favorites.some(id => id.toString() === restaurantId);

    let updateQuery;
    if (isFavorite) {
      updateQuery = { $pull: { favorites: new Types.ObjectId(restaurantId) } };
    } else {
      updateQuery = { $addToSet: { favorites: new Types.ObjectId(restaurantId) } };
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      updateQuery,
      { new: true },
    ).exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return updatedUser.favorites.map(id => id.toString());
  }

  async getFavorites(userId: string): Promise<Restaurant[]> {
    const user = await this.userModel.findById(userId)
      .populate('favorites')
      .exec();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.favorites as unknown as Restaurant[];
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId).select('favorites').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.favorites.map(id => id.toString());
  }
}
