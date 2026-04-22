import { Controller, Get, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { Query, Param } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get('profile')
  async getProfile(@CurrUser() user: any) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.getProfile(uid);
  }

  @Patch('profile')
  async updateProfile(
    @CurrUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.updateProfile(uid, updateUserDto);
  }

  @Patch('fcm-token')
  async updateFcmToken(
    @CurrUser() user: any,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.updateFcmToken(uid, dto);
  }

  @Delete('profile')
  async deleteProfile(@CurrUser() user: any) {
    const uid = user.uid || user.firebaseUid;
    return this.usersService.deleteAccount(uid);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.usersService.findAllAdmin(parsedPage, parsedLimit);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.updateStatus(id, role);
  }

  @Post('admin/sync-stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async syncStats() {
    return this.usersService.syncAllUserStats();
  }
}
