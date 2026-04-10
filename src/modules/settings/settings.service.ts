import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cachedSettings: SettingsDocument | null = null;
  private readonly CONFIG_ID = 'GLOBAL_CONFIG';

  constructor(@InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>) {}

  async onModuleInit() {
    await this.initializeSettings();
  }

  private async initializeSettings() {
    const settings = await this.settingsModel.findOne({ configId: this.CONFIG_ID }).exec();
    if (!settings) {
      this.logger.log('Initializing global settings with default values...');
      const newSettings = new this.settingsModel({ configId: this.CONFIG_ID });
      await newSettings.save();
      this.cachedSettings = newSettings;
    } else {
      this.cachedSettings = settings;
    }
  }

  async getSettings(): Promise<SettingsDocument> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }
    const settings = await this.settingsModel.findOne({ configId: this.CONFIG_ID }).exec();
    if (!settings) {
      throw new Error('Global settings not initialized. Refresh the application.');
    }
    this.cachedSettings = settings;
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsDocument> {
    const settings = await this.settingsModel.findOneAndUpdate(
      { configId: this.CONFIG_ID },
      { $set: dto },
      { new: true, upsert: true }
    ).exec();
    
    if (!settings) {
      throw new Error('Failed to update global settings');
    }

    this.cachedSettings = settings;
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
