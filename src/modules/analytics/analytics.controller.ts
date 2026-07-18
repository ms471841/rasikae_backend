import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('global')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getGlobalStats() {
    return this.analyticsService.getGlobalStats();
  }

  @Get('trends')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getWeeklyTrends() {
    return this.analyticsService.getWeeklyTrends();
  }

  @Get('restaurant/:restaurantId')
  @UseGuards(FirebaseAuthGuard)
  getRestaurantAnalytics(@CurrUser() user: any, @Param('restaurantId') restaurantId: string) {
    return this.analyticsService.getRestaurantDashboardStats(restaurantId, user);
  }
}
