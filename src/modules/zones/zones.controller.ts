import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * OPERATIONAL ZONES & HUBS CONTROLLER
 * Manages Multi-City Geofences, Branch Allocations & Surge Fees
 * ============================================================================
 */
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  /**
   * [👑 ADMIN] Create a new operational zone
   * POST /zones
   */
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  /**
   * [👑 ADMIN / 👔 SUB-ADMIN] List all operational zones (scoped for sub-admin)
   * GET /zones
   */
  @Get()
  @UseGuards(FirebaseAuthGuard)
  findAll(@CurrUser() user: any) {
    return this.zonesService.findAll(user);
  }

  /**
   * [🌐 SYSTEM / 📱 APPS] Locate operational zone by GPS coordinates
   * GET /zones/locate?lat=12.9716&lng=77.5946
   */
  @Get('locate')
  async locateByCoordinates(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    if (!lat || !lng) {
      throw new BadRequestException('Latitude and longitude are required.');
    }
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    return this.zonesService.findByCoordinates(parsedLng, parsedLat);
  }

  /**
   * [👑 ADMIN / 👔 SUB-ADMIN] Get single zone details by ID
   * GET /zones/:id
   */
  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  /**
   * [👑 ADMIN] Update zone details, boundaries, or surge fees
   * PATCH /zones/:id
   */
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin', 'sub_admin')
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  /**
   * [👑 ADMIN] Delete / Deactivate a zone
   * DELETE /zones/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
