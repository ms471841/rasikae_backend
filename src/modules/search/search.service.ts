import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async searchAll(
    query: string,
    lat?: number,
    lng?: number,
    filters?: { isVeg?: boolean; minRating?: number },
    maxDistance: number = 1000000, // Increased to 1,000km for development discovery
  ) {
    // Escape regex to prevent injection
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const qRegex = new RegExp(safeQuery, 'i');
    const limit = 20;

    let restaurants = [];

    // Base match for restaurants: Approved and Published
    const restMatch: any = {
      status: 'approved',
      isPublished: true,
      $or: [{ name: qRegex }, { description: qRegex }],
    };

    if (filters?.isVeg === true) {
      restMatch.isVeg = true;
    }
    if (filters?.minRating !== undefined) {
      restMatch.rating = { $gte: filters.minRating };
    }

    // If coordinates are provided, do a geospatial search
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      restaurants = await this.restaurantModel
        .aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'dist.calculated',
              maxDistance: maxDistance,
              query: restMatch,
              spherical: true,
            },
          },
          { $limit: limit },
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
        ])
        .exec();
    } else {
      // Fallback to standard text regex search
      restaurants = await this.restaurantModel
        .find(restMatch)
        .populate('categories cuisines')
        .limit(limit)
        .lean()
        .exec();
    }

    return {
      restaurants,
      menuItems: [], // Return empty for compatibility
    };
  }
}
