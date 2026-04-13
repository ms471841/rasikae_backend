import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { FavouriteRestaurantsService } from './favourite-restaurants.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('favourite-restaurants')
@UseGuards(FirebaseAuthGuard)
export class FavouriteRestaurantsController {
  constructor(private readonly favoritesService: FavouriteRestaurantsService) {}

  @Post('toggle/:restaurantId')
  async toggleFavorite(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.favoritesService.toggleFavorite(user._id.toString(), restaurantId);
  }

  @Get()
  async getFavorites(@CurrUser() user: any) {
    return this.favoritesService.getFavorites(user._id.toString());
  }

  @Get('ids')
  async getFavoriteIds(@CurrUser() user: any) {
    return this.favoritesService.getFavoriteIds(user._id.toString());
  }
}
