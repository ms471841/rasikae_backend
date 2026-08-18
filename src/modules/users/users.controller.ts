import { Controller, Get, Post, Body, Patch, Delete, UseGuards, Query, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * ============================================================================
 * USERS MANAGEMENT CONTROLLER
 * Handles User Sync, Profile Management, FCM Tokens & Admin User Administration
 * ============================================================================
 */
@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP / COMMON APIs (Auth & Profile Management)
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP / COMMON] Sync Firebase auth user with MongoDB user profile
   * POST /users/sync
   */
  @Post('sync')
  async syncUser(
    @CurrUser() user: any,
    @Body() createUserDto: CreateUserDto,
  ) {
    const uid = user?.uid || user?.firebaseUid;
    return this.usersService.syncUser(
      uid,
      createUserDto,
      user?.email,
      user?.phone_number || user?.phone,
    );
  }

  /**
   * [📱 USER APP / COMMON] Get profile of current logged-in user
   * GET /users/profile
   */
  @Get('profile')
  async getProfile(@CurrUser() user: any) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.getProfile(uid);
  }

  /**
   * [📱 USER APP / COMMON] Update profile of current logged-in user
   * PATCH /users/profile
   */
  @Patch('profile')
  async updateProfile(
    @CurrUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.updateProfile(uid, updateUserDto);
  }

  /**
   * [📱 USER APP / COMMON] Update Firebase Push Notification FCM Token
   * PATCH /users/fcm-token
   */
  @Patch('fcm-token')
  async updateFcmToken(
    @CurrUser() user: any,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.updateFcmToken(uid, dto);
  }

  /**
   * [📱 USER APP / COMMON] Delete user profile & account
   * DELETE /users/profile
   */
  @Delete('profile')
  async deleteProfile(@CurrUser() user: any) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.deleteAccount(uid);
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Search users by query string
   * GET /users/admin/search?q=query&page=1&limit=10
   */
  @Get('admin/search')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async searchUsers(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.usersService.searchUsers(query, parsedPage, parsedLimit);
  }

  /**
   * [👑 ADMIN PANEL] List all registered users with pagination & search
   * GET /users/admin/all?page=1&limit=20&search=john
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.usersService.findAllAdmin(parsedPage, parsedLimit, search);
  }

  /**
   * [👑 ADMIN PANEL] Update user role (e.g. customer, vendor, driver, admin)
   * PATCH /users/admin/:id/status
   */
  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.updateStatus(id, role);
  }

  /**
   * [👑 ADMIN PANEL] Recalculate stats for all users
   * POST /users/admin/sync-stats
   */
  @Post('admin/sync-stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async syncStats() {
    return this.usersService.syncAllUserStats();
  }

  /**
   * [👑 ADMIN PANEL] Toggle user active/blocked status
   * PATCH /users/admin/:id/toggle-active
   */
  @Patch('admin/:id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleUserActive(id);
  }
}
