import { Controller, Get, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';
import type { DecodedIdToken } from 'firebase-admin/auth';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sync')
  async syncUser(
    @CurrUser() user: any,
    @Body() createUserDto: CreateUserDto,
  ) {
    console.log('--- syncUser Controller Request ---');
    console.log('Received user object keys:', Object.keys(user || {}));
    console.log('user.uid:', user?.uid);
    console.log('user.firebaseUid:', user?.firebaseUid);
    
    const uid = user?.uid || user?.firebaseUid;
    console.log('Resolved uid:', uid);
    console.log('createUserDto:', createUserDto);
    
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
}
