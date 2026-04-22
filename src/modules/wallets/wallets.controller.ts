import { Controller, Get, Param } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Body, Post, UseGuards } from '@nestjs/common';
import { WithdrawDto } from './dto/withdraw.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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

  @Post('restaurant/:restaurantId/withdraw')
  requestWithdraw(@Param('restaurantId') restaurantId: string, @Body() withdrawDto: WithdrawDto) {
    return this.walletsService.requestWithdrawal(restaurantId, withdrawDto);
  }

  @Get('admin/auditor')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findAllWallets() {
    return this.walletsService.findAllWallets();
  }

  @Get('admin/ledger')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findAllTransactions() {
    return this.walletsService.findAllTransactions();
  }

  @Post('admin/settle/:walletId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  settleWallet(@Param('walletId') walletId: string) {
    return this.walletsService.settleWallet(walletId);
  }

  @Get('admin/wallets/:walletId/transactions')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findTransactionsByWallet(@Param('walletId') walletId: string) {
    return this.walletsService.findTransactionsByWallet(walletId);
  }

  @Post('admin/settle-batch')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  settleBatch(@Body('walletIds') walletIds: string[]) {
    return this.walletsService.settleBatch(walletIds);
  }
}
