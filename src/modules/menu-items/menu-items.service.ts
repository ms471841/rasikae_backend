import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const createdMenuItem = new this.menuItemModel(createMenuItemDto);
    const savedItem = await createdMenuItem.save();

    // Sync Categories & Cuisines to Restaurant
    const updateOps: any = {};
    if (savedItem.categoryIds && savedItem.categoryIds.length > 0) {
      updateOps.categories = { $each: savedItem.categoryIds };
    }
    if (savedItem.cuisines && savedItem.cuisines.length > 0) {
      updateOps.cuisines = { $each: savedItem.cuisines };
    }

    if (Object.keys(updateOps).length > 0) {
      await this.restaurantModel.findByIdAndUpdate(
        savedItem.restaurantId,
        { $addToSet: updateOps }
      ).exec();
    }

    return savedItem;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    filters: { search?: string; restaurantId?: string; isVeg?: boolean; isAvailable?: boolean } = {}
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }
    if (filters.restaurantId) {
      query.restaurantId = filters.restaurantId;
    }
    if (filters.isVeg !== undefined) {
      query.isVeg = filters.isVeg;
    }
    if (filters.isAvailable !== undefined) {
      query.isAvailable = filters.isAvailable;
    }

    const [data, totalItems] = await Promise.all([
      this.menuItemModel.find(query)
        .populate('restaurantId', 'name logo')
        .populate('categoryIds cuisines')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.menuItemModel.countDocuments(query).exec()
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      totalItems,
      totalPages,
      currentPage: page,
    };
  }

  async findByRestaurant(
    id: string,
    page: number = 1,
    limit: number = 10,
    filters: { isVeg?: boolean; isAvailable?: boolean } = {}
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = { restaurantId: id };

    if (filters.isAvailable !== undefined) {
      query.isAvailable = filters.isAvailable;
    }

    if (filters.isVeg !== undefined) {
      query.isVeg = filters.isVeg;
    }

    const data = await this.menuItemModel
      .find(query)
      .populate('categoryIds')
      .skip(skip)
      .limit(limit)
      .exec();

    const totalItems = await this.menuItemModel.countDocuments(query).exec();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      totalItems,
      totalPages,
      currentPage: page,
    };
  }

  async getGroupedMenuByRestaurant(id: string): Promise<any[]> {
    const allItems = await this.menuItemModel
      .find({ restaurantId: id, isAvailable: true })
      .populate('categoryIds')
      .lean()
      .exec();

    if (allItems.length === 0) return [];

    // 1. Extract Popular Items (Top 5 by rating and count)
    const popularItems = [...allItems]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.ratingCount || 0) - (a.ratingCount || 0))
      .slice(0, 5);

    // 2. Group by Category
    const groupedMap = new Map<string, any[]>();
    
    // Add popular section if exists
    if (popularItems.length > 0) {
      groupedMap.set('Popular Items', popularItems);
    }

    // Group the rest
    for (const item of allItems) {
      const categories = (item.categoryIds as any[]) || [];
      if (categories.length === 0) {
        const categoryName = 'Other';
        if (!groupedMap.has(categoryName)) {
          groupedMap.set(categoryName, []);
        }
        groupedMap.get(categoryName)!.push(item);
      } else {
        for (const cat of categories) {
          const categoryName = cat?.name || 'Other';
          if (!groupedMap.has(categoryName)) {
            groupedMap.set(categoryName, []);
          }
          groupedMap.get(categoryName)!.push(item);
        }
      }
    }

    // Convert Map to Array of Objects for easier consumption in Flutter
    return Array.from(groupedMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }

  async findOne(id: string): Promise<MenuItem> {
    const menuItem = await this.menuItemModel.findById(id).exec();
    if (!menuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }
    return menuItem;
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    const oldItem = await this.menuItemModel.findById(id).exec();
    if (!oldItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }

    const updatedMenuItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateMenuItemDto, { returnDocument: 'after' })
      .exec();

    if (!updatedMenuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }

    // --- Sync Restaurant Categories & Cuisines ---
    const restaurantId = updatedMenuItem.restaurantId.toString();

    // 1. Handle Categories
    if (updateMenuItemDto.categoryIds) {
      // Add newly selected categories
      await this.restaurantModel.findByIdAndUpdate(
        restaurantId,
        { $addToSet: { categories: { $each: updatedMenuItem.categoryIds } } }
      ).exec();

      // Cleanup old categories that are no longer present in the item
      const removedCats = oldItem.categoryIds.filter(catId => 
        !updatedMenuItem.categoryIds.some(newId => newId.toString() === catId.toString())
      );
      
      for (const catId of removedCats) {
        await this.syncRestaurantCategories(restaurantId, catId.toString());
      }
    }

    // 2. Handle Cuisines
    if (updateMenuItemDto.cuisines) {
      // Add newly selected cuisines
      await this.restaurantModel.findByIdAndUpdate(
        restaurantId,
        { $addToSet: { cuisines: { $each: updatedMenuItem.cuisines } } }
      ).exec();

      // Cleanup old cuisines
      const oldCuisines = oldItem.cuisines || [];
      const newCuisines = updatedMenuItem.cuisines || [];
      
      const removedCuisines = oldCuisines.filter(cId => 
        !newCuisines.some(newId => newId.toString() === cId.toString())
      );

      for (const cId of removedCuisines) {
        await this.syncRestaurantCuisines(restaurantId, cId.toString());
      }
    }

    return updatedMenuItem;
  }

  async remove(id: string): Promise<MenuItem> {
    const deletedMenuItem = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!deletedMenuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }

    const restaurantId = deletedMenuItem.restaurantId.toString();

    // Cleanup Categories
    if (deletedMenuItem.categoryIds) {
      for (const catId of deletedMenuItem.categoryIds) {
        await this.syncRestaurantCategories(restaurantId, catId.toString());
      }
    }

    // Cleanup Cuisines
    if (deletedMenuItem.cuisines) {
      for (const cuisineId of deletedMenuItem.cuisines) {
        await this.syncRestaurantCuisines(restaurantId, cuisineId.toString());
      }
    }

    return deletedMenuItem;
  }

  private async syncRestaurantCategories(restaurantId: string, categoryId: string) {
    const count = await this.menuItemModel.countDocuments({
      restaurantId,
      categoryIds: categoryId,
    }).exec();

    if (count === 0) {
      await this.restaurantModel.findByIdAndUpdate(
        restaurantId,
        { $pull: { categories: categoryId } }
      ).exec();
    }
  }

  private async syncRestaurantCuisines(restaurantId: string, cuisineId: string) {
    const count = await this.menuItemModel.countDocuments({
      restaurantId,
      cuisines: cuisineId,
    }).exec();

    if (count === 0) {
      await this.restaurantModel.findByIdAndUpdate(
        restaurantId,
        { $pull: { cuisines: cuisineId } }
      ).exec();
    }
  }
}
