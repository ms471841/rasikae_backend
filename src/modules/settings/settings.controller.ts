import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * ============================================================================
 * SYSTEM SETTINGS CONTROLLER
 * Handles Global App Configurations, Delivery Fees & System Switches
 * ============================================================================
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP / 🌐 PUBLIC / 👑 ADMIN APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP / 👑 ADMIN / 🌐 PUBLIC] Get active system configuration
   * GET /settings
   */
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Update system configuration, fees or operational limits
   * PATCH /settings
   */
  @Patch()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}
