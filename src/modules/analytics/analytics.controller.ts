import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('restaurant/:restaurantId')
  getRestaurantAnalytics(@Param('restaurantId') restaurantId: string) {
    return this.analyticsService.getRestaurantDashboardStats(restaurantId);
  }
}
