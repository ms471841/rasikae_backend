import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * ANALYTICS & DASHBOARD METRICS CONTROLLER
 * Handles System Analytics, Weekly Trends & Vendor Restaurant Metrics
 * ============================================================================
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Get system-wide platform statistics & revenue overview
   * GET /analytics/global
   */
  @Get('global')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  /**
   * [👑 ADMIN PANEL] Get weekly revenue & order volume trend charts
   * GET /analytics/trends
   */
  @Get('trends')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getWeeklyTrends() {
    return this.analyticsService.getWeeklyTrends();
  }

  // --------------------------------------------------------------------------
  // 🍳 VENDOR APP APIs
  // --------------------------------------------------------------------------

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Get dashboard analytics for a specific restaurant
   * GET /analytics/restaurant/:restaurantId
   */
  @Get('restaurant/:restaurantId')
  @UseGuards(FirebaseAuthGuard)
  getRestaurantAnalytics(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.analyticsService.getRestaurantDashboardStats(
      restaurantId,
      user,
    );
  }
}
