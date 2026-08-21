import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { OnboardDriverDto } from './dto/onboard-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * DRIVERS MANAGEMENT CONTROLLER
 * Handles Driver Onboarding, Fleet Operations, Availability & GPS Tracking
 * ============================================================================
 */
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  // --------------------------------------------------------------------------
  // 🛵 DRIVER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [🛵 DRIVER APP] Check if driver account exists by phone number
   * GET /drivers/check-phone?phone=9876543210
   */
  @Get('check-phone')
  @HttpCode(HttpStatus.OK)
  async checkDriverPhone(@Query('phone') phone: string) {
    if (!phone) {
      return { exists: false };
    }
    const exists = await this.driversService.checkDriverExistsByPhone(phone);
    return { exists };
  }

  /**
   * [🛵 DRIVER APP] Register driver profile after signup
   * POST /drivers
   */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrUser() user: any, @Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto, user);
  }

  /**
   * [🛵 DRIVER APP / 👑 ADMIN] Get single driver profile details
   * GET /drivers/:id
   */
  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  /**
   * [🛵 DRIVER APP] Update driver status (e.g. ONLINE, OFFLINE, ON_DELIVERY)
   * PATCH /drivers/:id/status
   */
  @Patch(':id/status')
  @UseGuards(FirebaseAuthGuard)
  updateStatus(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateDriverStatusDto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(id, updateDriverStatusDto, user);
  }

  /**
   * [🛵 DRIVER APP] Send real-time GPS location updates
   * PATCH /drivers/:id/location
   */
  @Patch(':id/location')
  @UseGuards(FirebaseAuthGuard)
  updateLocation(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(id, updateLocationDto, user);
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Directly onboard a driver into the system
   * POST /drivers/onboard
   */
  @Post('onboard')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  onboard(@Body() onboardDriverDto: OnboardDriverDto) {
    return this.driversService.onboardDriver(onboardDriverDto);
  }

  /**
   * [👑 ADMIN PANEL] Get list of all registered drivers
   * GET /drivers
   */
  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.driversService.findAll();
  }

  /**
   * [👑 ADMIN PANEL] Get complete driver fleet with live status & metrics
   * GET /drivers/admin/fleet
   */
  @Get('admin/fleet')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getFleet() {
    return this.driversService.getFleet();
  }

  // --------------------------------------------------------------------------
  // 🌐 SYSTEM / DISPATCH APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN / 🌐 SYSTEM] Find all currently available drivers
   * GET /drivers/available
   */
  @Get('available')
  @UseGuards(FirebaseAuthGuard)
  findAvailable() {
    return this.driversService.findAvailable();
  }

  /**
   * [👑 ADMIN / 🌐 SYSTEM] Find nearby available drivers based on coordinates
   * GET /drivers/nearby?lat=...&lng=...&distance=10000
   */
  @Get('nearby')
  @UseGuards(FirebaseAuthGuard)
  findNearbyAvailable(
    @Query('lng') lng: string,
    @Query('lat') lat: string,
    @Query('distance') distance: string,
  ) {
    if (!lng || !lat) throw new Error('Longitude and Latitude are required.');
    const maxDistance = distance ? parseInt(distance, 10) : 10000; // 10km default
    return this.driversService.findNearbyAvailable(
      parseFloat(lng),
      parseFloat(lat),
      maxDistance,
    );
  }
}
