import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Zone, ZoneDocument } from './schemas/zone.schema';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectModel(Zone.name) private readonly zoneModel: Model<ZoneDocument>,
  ) {}

  /**
   * [👑 ADMIN] Create a new operational zone / hub
   */
  async create(createZoneDto: CreateZoneDto): Promise<ZoneDocument> {
    const payload: any = { ...createZoneDto };
    if (createZoneDto.managerId) {
      payload.managerId = new mongoose.Types.ObjectId(createZoneDto.managerId);
    }
    const zone = new this.zoneModel(payload);
    return zone.save();
  }

  /**
   * [👑 ADMIN / 👔 SUB-ADMIN] Fetch zones (scoped if sub_admin)
   */
  async findAll(user?: any): Promise<ZoneDocument[]> {
    const query: any = {};

    if (user && user.role === 'sub_admin') {
      const assignedIds = (user.assignedZones || []).map(
        (z: any) => new mongoose.Types.ObjectId(z),
      );
      query.$or = [
        { _id: { $in: assignedIds } },
        { managerId: new mongoose.Types.ObjectId(user._id) },
      ];
    }

    return this.zoneModel
      .find(query)
      .populate('managerId', 'name email phone avatarUrl')
      .sort({ city: 1, name: 1 })
      .exec();
  }

  /**
   * [👑 ADMIN / 👔 SUB-ADMIN / 📱 APPS] Get single zone by ID
   */
  async findOne(id: string): Promise<ZoneDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid Zone ID: ${id}`);
    }
    const zone = await this.zoneModel
      .findById(id)
      .populate('managerId', 'name email phone avatarUrl')
      .exec();
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found.`);
    }
    return zone;
  }

  /**
   * [🌐 SYSTEM / 📱 APPS] Find operational zone containing GPS coordinates
   */
  async findByCoordinates(
    lng: number,
    lat: number,
  ): Promise<ZoneDocument | null> {
    return this.zoneModel
      .findOne({
        isActive: true,
        boundary: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
          },
        },
      })
      .exec();
  }

  /**
   * [👑 ADMIN] Update zone boundary, manager, or surge pricing
   */
  async update(
    id: string,
    updateZoneDto: UpdateZoneDto,
  ): Promise<ZoneDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid Zone ID: ${id}`);
    }
    const payload: any = { ...updateZoneDto };
    if (updateZoneDto.managerId) {
      payload.managerId = new mongoose.Types.ObjectId(updateZoneDto.managerId);
    }

    const updated = await this.zoneModel
      .findByIdAndUpdate(id, { $set: payload }, { new: true })
      .populate('managerId', 'name email phone avatarUrl')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Zone with ID ${id} not found.`);
    }
    return updated;
  }

  /**
   * [👑 ADMIN] Soft-delete or remove zone
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid Zone ID: ${id}`);
    }
    const result = await this.zoneModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Zone with ID ${id} not found.`);
    }
    return { success: true, message: 'Zone successfully deleted.' };
  }
}
