import { Controller, Get, Post, Body, Patch, Param, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { OnboardDriverDto } from './dto/onboard-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Post('onboard')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  onboard(@Body() onboardDriverDto: OnboardDriverDto) {
    return this.driversService.onboardDriver(onboardDriverDto);
  }

  @Get()
  findAll() {
    return this.driversService.findAll();
  }

  @Get('admin/fleet')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getFleet() {
    return this.driversService.getFleet();
  }

  @Get('available')
  findAvailable() {
    return this.driversService.findAvailable();
  }

  @Get('nearby')
  findNearbyAvailable(
    @Query('lng') lng: string, 
    @Query('lat') lat: string, 
    @Query('distance') distance: string
  ) {
    if (!lng || !lat) throw new Error('Longitude and Latitude are required.');
    const maxDistance = distance ? parseInt(distance, 10) : 10000; // 10km default
    return this.driversService.findNearbyAvailable(parseFloat(lng), parseFloat(lat), maxDistance);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() updateDriverStatusDto: UpdateDriverStatusDto) {
    return this.driversService.updateStatus(id, updateDriverStatusDto);
  }

  @Patch(':id/location')
  updateLocation(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.driversService.updateLocation(id, updateLocationDto);
  }
}
