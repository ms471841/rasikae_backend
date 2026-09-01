import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

import { CacheService } from '../cache/cache.service';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly CONFIG_ID = 'GLOBAL_CONFIG';
  private readonly CACHE_KEY = 'settings:global_config';
  private readonly CACHE_TTL_SECONDS = 600; // 10 minutes

  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    await this.initializeSettings();
  }

  private async initializeSettings() {
    const settings = await this.settingsModel
      .findOne({ configId: this.CONFIG_ID })
      .exec();
    if (!settings) {
      this.logger.log('Initializing global settings...');
      const newSettings = new this.settingsModel({
        configId: this.CONFIG_ID,
        termsAndConditions: '',
        privacyPolicy: '',
        aboutUs: '',
        refundPolicy: '',
        faqs: [],
      });
      await newSettings.save();
      await this.cacheService.set(this.CACHE_KEY, newSettings.toJSON ? newSettings.toJSON() : newSettings, this.CACHE_TTL_SECONDS);
    } else {
      await this.cacheService.set(this.CACHE_KEY, settings.toJSON ? settings.toJSON() : settings, this.CACHE_TTL_SECONDS);
    }
  }

  async getSettings(): Promise<SettingsDocument> {
    const cached = await this.cacheService.get<SettingsDocument>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    const settings = await this.settingsModel
      .findOne({ configId: this.CONFIG_ID })
      .exec();
    if (!settings) {
      throw new Error(
        'Global settings not initialized. Refresh the application.',
      );
    }

    const plainSettings = settings.toJSON ? settings.toJSON() : settings;
    await this.cacheService.set(this.CACHE_KEY, plainSettings, this.CACHE_TTL_SECONDS);
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsDocument> {
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { configId: this.CONFIG_ID },
        { $set: dto },
        { new: true, upsert: true },
      )
      .exec();

    if (!settings) {
      throw new Error('Failed to update global settings');
    }

    await this.cacheService.del(this.CACHE_KEY);
    const plainSettings = settings.toJSON ? settings.toJSON() : settings;
    await this.cacheService.set(this.CACHE_KEY, plainSettings, this.CACHE_TTL_SECONDS);
    this.logger.log('Global settings updated and cache refreshed.');
    return settings;
  }

  // Helper for direct property access (cached)
  async getFeeAndTax() {
    const settings = await this.getSettings();
    return {
      deliveryBaseFee: settings.deliveryBaseFee,
      taxPercentage: settings.taxPercentage,
      minOrderValue: settings.minOrderValue,
      isMaintenanceMode: settings.isMaintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
    };
  }
}
