import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const createdMenuItem = new this.menuItemModel(createMenuItemDto);
    return createdMenuItem.save();
  }

  async findAll(): Promise<MenuItem[]> {
    return this.menuItemModel.find().exec();
  }

  async findByRestaurant(id: string): Promise<MenuItem[]> {
    return this.menuItemModel.find({ restaurantId: id }).exec();
  }

  async findOne(id: string): Promise<MenuItem> {
    const menuItem = await this.menuItemModel.findById(id).exec();
    if (!menuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }
    return menuItem;
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    const updatedMenuItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateMenuItemDto, { new: true })
      .exec();
    if (!updatedMenuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }
    return updatedMenuItem;
  }

  async remove(id: string): Promise<MenuItem> {
    const deletedMenuItem = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!deletedMenuItem) {
      throw new NotFoundException(`MenuItem with ID ${id} not found`);
    }
    return deletedMenuItem;
  }
}
