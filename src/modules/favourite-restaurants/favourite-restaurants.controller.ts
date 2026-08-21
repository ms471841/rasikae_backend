import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { FavouriteRestaurantsService } from './favourite-restaurants.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * FAVOURITE RESTAURANTS CONTROLLER
 * Handles Bookmarking & Favoriting Restaurants for Customers
 * ============================================================================
 */
@Controller('favourite-restaurants')
@UseGuards(FirebaseAuthGuard)
export class FavouriteRestaurantsController {
  constructor(private readonly favoritesService: FavouriteRestaurantsService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Toggle favorite status of a restaurant
   * POST /favourite-restaurants/toggle/:restaurantId
   */
  @Post('toggle/:restaurantId')
  async toggleFavorite(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.favoritesService.toggleFavorite(
      user._id.toString(),
      restaurantId,
    );
  }

  /**
   * [📱 USER APP] Get list of all favorited restaurant objects
   * GET /favourite-restaurants
   */
  @Get()
  async getFavorites(@CurrUser() user: any) {
    return this.favoritesService.getFavorites(user._id.toString());
  }

  /**
   * [📱 USER APP] Get array of favorited restaurant IDs for quick UI lookup
   * GET /favourite-restaurants/ids
   */
  @Get('ids')
  async getFavoriteIds(@CurrUser() user: any) {
    return this.favoritesService.getFavoriteIds(user._id.toString());
  }
}
