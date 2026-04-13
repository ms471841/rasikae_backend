import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async searchAll(query: string, lat?: number, lng?: number, maxDistance: number = 20000) {
    // Escape regex to prevent injection
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const qRegex = new RegExp(safeQuery, 'i');
    const limit = 20;

    let restaurants = [];
    
    // Base match for restaurants: Approved and Published
    const restMatch = {
      status: 'approved',
      isPublished: true,
      $or: [
        { name: qRegex },
        { description: qRegex }
      ]
    };

    // If coordinates are provided, do a geospatial search
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      restaurants = await this.restaurantModel.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'dist.calculated',
            maxDistance: maxDistance, // meters (e.g. 20km)
            query: restMatch,
            spherical: true
          }
        },
        { $limit: limit }
      ]).exec();
    } else {
      // Fallback to standard text regex search
      restaurants = await this.restaurantModel.find(restMatch).limit(limit).lean().exec();
    }

    // Search Menu Items
    const items = await this.menuItemModel.find({
      isAvailable: true,
      $or: [
        { name: qRegex },
        { description: qRegex }
      ]
    })
    .populate({
        path: 'restaurantId',
        match: { status: 'approved', isPublished: true },
        select: 'name logo status isPublished'
    })
    .limit(limit)
    .lean()
    .exec();

    // Filter out menu items that belong to unapproved/unpublished restaurants
    const validItems = items.filter(item => item.restaurantId !== null);

    return {
      restaurants,
      menuItems: validItems
    };
  }
}
