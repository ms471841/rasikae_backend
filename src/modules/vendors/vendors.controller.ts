import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vendors')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('admin/create')
  @Roles('admin')
  create(@Body() data: { name: string, email: string, phone: string, businessName: string }) {
    return this.vendorsService.createVendor(data);
  }

  @Get('admin/search')
  @Roles('admin')
  search(@Query('q') query: string) {
    return this.vendorsService.findAll(1, 10, query);
  }

  @Get('admin/all')
  @Roles('admin')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.vendorsService.findAll(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      search
    );
  }

  @Get('admin/:id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch('admin/:id/status')
  @Roles('admin')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.vendorsService.updateStatus(id, status, reason);
  }

  @Patch('admin/:id/toggle-active')
  @Roles('admin')
  toggleActive(@Param('id') id: string) {
    return this.vendorsService.toggleActive(id);
  }
}
