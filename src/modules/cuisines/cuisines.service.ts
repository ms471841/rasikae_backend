import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCuisineDto } from './dto/create-cuisine.dto';
import { UpdateCuisineDto } from './dto/update-cuisine.dto';
import { Cuisine, CuisineDocument } from './schemas/cuisine.schema';

@Injectable()
export class CuisinesService {
  constructor(@InjectModel(Cuisine.name) private cuisineModel: Model<CuisineDocument>) {}

  async create(createCuisineDto: CreateCuisineDto) {
    const created = new this.cuisineModel(createCuisineDto);
    return created.save();
  }

  async findAll() {
    return this.cuisineModel.find().exec();
  }

  async findOne(id: string) {
    return this.cuisineModel.findById(id).exec();
  }

  async update(id: string, updateCuisineDto: UpdateCuisineDto) {
    const updated = await this.cuisineModel.findByIdAndUpdate(id, updateCuisineDto, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException(`Cuisine #${id} not found`);
    }
    return updated;
  }

  async remove(id: string) {
    return this.cuisineModel.findByIdAndDelete(id).exec();
  }
}
