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

    // Sync Category to Restaurant
    await this.restaurantModel.findByIdAndUpdate(
      savedItem.restaurantId,
      { $addToSet: { categories: savedItem.categoryId } }
    ).exec();

    return savedItem;
  }

  async findAll(): Promise<MenuItem[]> {
    return this.menuItemModel.find().exec();
  }

  async findByRestaurant(id: string): Promise<MenuItem[]> {
    return this.menuItemModel.find({ restaurantId: id, isAvailable: true }).populate('categoryId').exec();
  }

  async getGroupedMenuByRestaurant(id: string): Promise<any[]> {
    const allItems = await this.menuItemModel
      .find({ restaurantId: id, isAvailable: true })
      .populate('categoryId')
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
      const categoryName = (item.categoryId as any)?.name || 'Other';
      if (!groupedMap.has(categoryName)) {
        groupedMap.set(categoryName, []);
      }
      groupedMap.get(categoryName)!.push(item);
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
      .findByIdAndUpdate(id, updateMenuItemDto, { new: true })
      .exec();

    if (!updatedMenuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }

    // If category changed, sync both old and new
    if (updateMenuItemDto.categoryId && oldItem.categoryId.toString() !== updateMenuItemDto.categoryId.toString()) {
      // Add new
      await this.restaurantModel.findByIdAndUpdate(
        updatedMenuItem.restaurantId,
        { $addToSet: { categories: updatedMenuItem.categoryId } }
      ).exec();

      // Check if we should remove old
      await this.syncRestaurantCategories(oldItem.restaurantId.toString(), oldItem.categoryId.toString());
    }

    return updatedMenuItem;
  }

  async remove(id: string): Promise<MenuItem> {
    const deletedMenuItem = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!deletedMenuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }

    // Cleanup Category from Restaurant if no items left
    await this.syncRestaurantCategories(
      deletedMenuItem.restaurantId.toString(),
      deletedMenuItem.categoryId.toString()
    );

    return deletedMenuItem;
  }

  private async syncRestaurantCategories(restaurantId: string, categoryId: string) {
    const count = await this.menuItemModel.countDocuments({
      restaurantId,
      categoryId,
    }).exec();

    if (count === 0) {
      await this.restaurantModel.findByIdAndUpdate(
        restaurantId,
        { $pull: { categories: categoryId } }
      ).exec();
    }
  }
}
