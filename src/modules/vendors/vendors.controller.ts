import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * ============================================================================
 * VENDORS MANAGEMENT CONTROLLER
 * Handles Vendor Onboarding, Approval, Status Mutations & Vendor Listings
 * ============================================================================
 */
@Controller('vendors')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Register a new vendor account
   * POST /vendors/admin/create
   */
  @Post('admin/create')
  @Roles('admin')
  create(
    @Body()
    data: {
      name: string;
      email: string;
      phone: string;
      businessName: string;
    },
  ) {
    return this.vendorsService.createVendor(data);
  }

  /**
   * [👑 ADMIN PANEL] Search vendors by keyword
   * GET /vendors/admin/search?q=query
   */
  @Get('admin/search')
  @Roles('admin')
  search(@Query('q') query: string) {
    return this.vendorsService.findAll(1, 10, query);
  }

  /**
   * [👑 ADMIN PANEL] List all vendors with pagination & optional search
   * GET /vendors/admin/all?page=1&limit=20&search=keyword
   */
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
      search,
    );
  }

  /**
   * [👑 ADMIN PANEL] Get vendor profile details by ID
   * GET /vendors/admin/:id
   */
  @Get('admin/:id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  /**
   * [👑 ADMIN PANEL] Update vendor account status (APPROVED, REJECTED, SUSPENDED)
   * PATCH /vendors/admin/:id/status
   */
  @Patch('admin/:id/status')
  @Roles('admin')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.vendorsService.updateStatus(id, status, reason);
  }

  /**
   * [👑 ADMIN PANEL] Toggle vendor active/inactive state
   * PATCH /vendors/admin/:id/toggle-active
   */
  @Patch('admin/:id/toggle-active')
  @Roles('admin')
  toggleActive(@Param('id') id: string) {
    return this.vendorsService.toggleActive(id);
  }
}
