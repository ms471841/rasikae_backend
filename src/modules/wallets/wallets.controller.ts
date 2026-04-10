import { Controller, Get, Param } from '@nestjs/common';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('driver/:userId')
  getWallet(@Param('userId') userId: string) {
    return this.walletsService.getWalletByUser(userId);
  }

  @Get('driver/:userId/transactions')
  getTransactions(@Param('userId') userId: string) {
    return this.walletsService.getTransactionsByUser(userId);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantWallet(@Param('restaurantId') restaurantId: string) {
    return this.walletsService.getWalletByRestaurant(restaurantId);
  }

  @Get('restaurant/:restaurantId/transactions')
  getRestaurantTransactions(@Param('restaurantId') restaurantId: string) {
    return this.walletsService.getTransactionsByRestaurant(restaurantId);
  }
}
