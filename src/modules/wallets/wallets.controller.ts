import { Controller, Get, Param, ForbiddenException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Body, Post, UseGuards } from '@nestjs/common';
import { WithdrawDto } from './dto/withdraw.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('wallets')
@UseGuards(FirebaseAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('driver/:userId')
  getWallet(@CurrUser() user: any, @Param('userId') userId: string) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException('You are not authorized to access this driver wallet');
    }
    return this.walletsService.getWalletByUser(userId);
  }

  @Get('driver/:userId/transactions')
  getTransactions(@CurrUser() user: any, @Param('userId') userId: string) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException('You are not authorized to access these transactions');
    }
    return this.walletsService.getTransactionsByUser(userId);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantWallet(@CurrUser() user: any, @Param('restaurantId') restaurantId: string) {
    return this.walletsService.getWalletByRestaurant(restaurantId, user);
  }

  @Get('restaurant/:restaurantId/transactions')
  getRestaurantTransactions(@CurrUser() user: any, @Param('restaurantId') restaurantId: string) {
    return this.walletsService.getTransactionsByRestaurant(restaurantId, user);
  }

  @Post('restaurant/:restaurantId/withdraw')
  requestWithdraw(@CurrUser() user: any, @Param('restaurantId') restaurantId: string, @Body() withdrawDto: WithdrawDto) {
    return this.walletsService.requestWithdrawal(restaurantId, withdrawDto, user);
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

  @Get('admin/payout-requests')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getPendingWithdrawals() {
    return this.walletsService.getPendingWithdrawals();
  }

  @Post('admin/payout-requests/:id/complete')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  completeWithdrawal(@Param('id') id: string) {
    return this.walletsService.completeWithdrawal(id);
  }

  @Post('admin/payout-requests/:id/reject')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  rejectWithdrawal(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.walletsService.rejectWithdrawal(id, reason);
  }
}
