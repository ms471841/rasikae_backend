import {
  Controller,
  Get,
  Param,
  ForbiddenException,
  Body,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WithdrawDto } from './dto/withdraw.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * WALLETS & PAYOUTS CONTROLLER
 * Handles Driver Wallets, Restaurant Payout Requests & Admin Settlements
 * ============================================================================
 */
@Controller('wallets')
@UseGuards(FirebaseAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // --------------------------------------------------------------------------
  // 🛵 DRIVER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [🛵 DRIVER APP] Get driver wallet balance
   * GET /wallets/driver/:userId
   */
  @Get('driver/:userId')
  getWallet(@CurrUser() user: any, @Param('userId') userId: string) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException(
        'You are not authorized to access this driver wallet',
      );
    }
    return this.walletsService.getWalletByUser(userId);
  }

  /**
   * [🛵 DRIVER APP] Get driver wallet transactions history
   * GET /wallets/driver/:userId/transactions
   */
  @Get('driver/:userId/transactions')
  getTransactions(@CurrUser() user: any, @Param('userId') userId: string) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException(
        'You are not authorized to access these transactions',
      );
    }
    return this.walletsService.getTransactionsByUser(userId);
  }

  // --------------------------------------------------------------------------
  // 🍳 VENDOR APP APIs
  // --------------------------------------------------------------------------

  /**
   * [🍳 VENDOR APP] Get restaurant earnings wallet
   * GET /wallets/restaurant/:restaurantId
   */
  @Get('restaurant/:restaurantId')
  getRestaurantWallet(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.walletsService.getWalletByRestaurant(restaurantId, user);
  }

  /**
   * [🍳 VENDOR APP] Get restaurant earnings transaction ledger
   * GET /wallets/restaurant/:restaurantId/transactions
   */
  @Get('restaurant/:restaurantId/transactions')
  getRestaurantTransactions(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.walletsService.getTransactionsByRestaurant(restaurantId, user);
  }

  /**
   * [🍳 VENDOR APP] Request a payout withdrawal to bank account
   * POST /wallets/restaurant/:restaurantId/withdraw
   */
  @Post('restaurant/:restaurantId/withdraw')
  requestWithdraw(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.walletsService.requestWithdrawal(
      restaurantId,
      withdrawDto,
      user,
    );
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Audit all system wallets
   * GET /wallets/admin/auditor
   */
  @Get('admin/auditor')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findAllWallets() {
    return this.walletsService.findAllWallets();
  }

  /**
   * [👑 ADMIN PANEL] View global system transaction ledger
   * GET /wallets/admin/ledger
   */
  @Get('admin/ledger')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findAllTransactions() {
    return this.walletsService.findAllTransactions();
  }

  /**
   * [👑 ADMIN PANEL] Settle a specific wallet balance
   * POST /wallets/admin/settle/:walletId
   */
  @Post('admin/settle/:walletId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  settleWallet(@Param('walletId') walletId: string) {
    return this.walletsService.settleWallet(walletId);
  }

  /**
   * [👑 ADMIN PANEL] View transaction ledger for a specific wallet
   * GET /wallets/admin/wallets/:walletId/transactions
   */
  @Get('admin/wallets/:walletId/transactions')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findTransactionsByWallet(@Param('walletId') walletId: string) {
    return this.walletsService.findTransactionsByWallet(walletId);
  }

  /**
   * [👑 ADMIN PANEL] Batch settle multiple wallets
   * POST /wallets/admin/settle-batch
   */
  @Post('admin/settle-batch')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  settleBatch(@Body('walletIds') walletIds: string[]) {
    return this.walletsService.settleBatch(walletIds);
  }

  /**
   * [👑 ADMIN PANEL] Get pending payout withdrawal requests
   * GET /wallets/admin/payout-requests
   */
  @Get('admin/payout-requests')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  getPendingWithdrawals() {
    return this.walletsService.getPendingWithdrawals();
  }

  /**
   * [👑 ADMIN PANEL] Approve and complete a payout request
   * POST /wallets/admin/payout-requests/:id/complete
   */
  @Post('admin/payout-requests/:id/complete')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  completeWithdrawal(@Param('id') id: string) {
    return this.walletsService.completeWithdrawal(id);
  }

  /**
   * [👑 ADMIN PANEL] Reject a payout request
   * POST /wallets/admin/payout-requests/:id/reject
   */
  @Post('admin/payout-requests/:id/reject')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  rejectWithdrawal(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.walletsService.rejectWithdrawal(id, reason);
  }
}
