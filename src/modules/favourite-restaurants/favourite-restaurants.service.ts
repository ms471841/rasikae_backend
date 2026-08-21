import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';

@Injectable()
export class FavouriteRestaurantsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async toggleFavorite(
    userId: string,
    restaurantId: string,
  ): Promise<string[]> {
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

    const isFavorite = user.favorites.some(
      (id) => id.toString() === restaurantId,
    );

    let updateQuery;
    if (isFavorite) {
      updateQuery = { $pull: { favorites: new Types.ObjectId(restaurantId) } };
    } else {
      updateQuery = {
        $addToSet: { favorites: new Types.ObjectId(restaurantId) },
      };
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateQuery, { returnDocument: 'after' })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return updatedUser.favorites.map((id) => id.toString());
  }

  /**
   * Returns favourite restaurants with:
   *  - categories & cuisines fully populated (via $lookup)
   *  - dist.calculated attached when lat/lng are provided (via $geoNear)
   */
  async getFavorites(
    userId: string,
    lat?: number,
    lng?: number,
  ): Promise<Restaurant[]> {
    const user = await this.userModel
      .findById(userId)
      .select('favorites')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const favoriteIds = user.favorites.map(
      (id) => new Types.ObjectId(id.toString()),
    );
    if (favoriteIds.length === 0) return [];

    // Shared $lookup stages — matches the pattern used in findAll / getHomeFeed
    const populateLookups = [
      {
        $lookup: {
          from: 'categories',
          localField: 'categories',
          foreignField: '_id',
          as: 'categories',
        },
      },
      {
        $lookup: {
          from: 'cuisines',
          localField: 'cuisines',
          foreignField: '_id',
          as: 'cuisines',
        },
      },
    ];

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      // $geoNear must be the first stage; attaches dist.calculated to each doc
      return this.restaurantModel
        .aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'dist.calculated',
              spherical: true,
              query: { _id: { $in: favoriteIds } },
            },
          },
          ...populateLookups,
        ])
        .exec();
    }

    // No coordinates — plain match then populate
    return this.restaurantModel
      .aggregate([
        { $match: { _id: { $in: favoriteIds } } },
        ...populateLookups,
      ])
      .exec();
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const user = await this.userModel
      .findById(userId)
      .select('favorites')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.favorites.map((id) => id.toString());
  }
}
