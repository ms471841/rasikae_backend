import { Controller, Get, Post, Body, Patch, Param, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  findAll() {
    return this.driversService.findAll();
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
