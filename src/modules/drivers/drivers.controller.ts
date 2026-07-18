import { Controller, Get, Post, Body, Patch, Param, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { OnboardDriverDto } from './dto/onboard-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrUser() user: any, @Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto, user);
  }

  @Post('onboard')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  onboard(@Body() onboardDriverDto: OnboardDriverDto) {
    return this.driversService.onboardDriver(onboardDriverDto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(FirebaseAuthGuard)
  findAvailable() {
    return this.driversService.findAvailable();
  }

  @Get('nearby')
  @UseGuards(FirebaseAuthGuard)
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
  @UseGuards(FirebaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(FirebaseAuthGuard)
  updateStatus(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateDriverStatusDto: UpdateDriverStatusDto
  ) {
    return this.driversService.updateStatus(id, updateDriverStatusDto, user);
  }

  @Patch(':id/location')
  @UseGuards(FirebaseAuthGuard)
  updateLocation(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto
  ) {
    return this.driversService.updateLocation(id, updateLocationDto, user);
  }
}
