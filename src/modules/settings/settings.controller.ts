import { Controller, Get, Patch, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    // Note: In production, this endpoint must be protected by an AdminGuard
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}
