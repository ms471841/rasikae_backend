import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) {}

  async create(createAddressDto: CreateAddressDto): Promise<Address> {
    const { userId, isDefault } = createAddressDto;

    // Check if this is the very first address for this user
    const existingCount = await this.addressModel.countDocuments({ userId: new Types.ObjectId(userId) });
    const shouldBeDefault = isDefault || existingCount === 0;

    if (shouldBeDefault && existingCount > 0) {
      // Unset any existing default addresses for this user
      await this.addressModel.updateMany(
        { userId: new Types.ObjectId(userId) },
        { $set: { isDefault: false } }
      ).exec();
    }

    const newAddress = new this.addressModel({
      ...createAddressDto,
      isDefault: shouldBeDefault,
    });
    return newAddress.save();
  }

  async findAllByUser(userId: string): Promise<Address[]> {
    return this.addressModel.find({ userId: new Types.ObjectId(userId) }).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<Address> {
    const address = await this.addressModel.findOne({ _id: id, userId: new Types.ObjectId(userId) }).exec();
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    return address;
  }

  async update(id: string, userId: string, updateAddressDto: UpdateAddressDto): Promise<Address> {
    const { isDefault } = updateAddressDto;

    if (isDefault) {
      // Unset any existing default addresses for this user
      await this.addressModel.updateMany(
        { userId: new Types.ObjectId(userId) },
        { $set: { isDefault: false } }
      ).exec();
    }

    const address = await this.addressModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      updateAddressDto,
      { returnDocument: 'after' }
    ).exec();

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  async remove(id: string, userId: string): Promise<Address> {
    const address = await this.addressModel.findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) }).exec();
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    // If we deleted the default address, promote the most recently pushed address to default
    if (address.isDefault) {
      const remainingAddress = await this.addressModel.findOne({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).exec();
      if (remainingAddress) {
        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }

    return address;
  }
}
