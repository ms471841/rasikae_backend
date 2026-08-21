import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * USER ADDRESSES CONTROLLER
 * Handles Saved Addresses, Delivery Location Management & Default Selection
 * ============================================================================
 */
@Controller('addresses')
@UseGuards(FirebaseAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Save a new delivery address
   * POST /addresses
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrUser() user: any, @Body() createAddressDto: CreateAddressDto) {
    if (
      user.role !== 'admin' &&
      user._id.toString() !== createAddressDto.userId
    ) {
      throw new ForbiddenException(
        'You cannot create an address for another user',
      );
    }
    return this.addressesService.create(createAddressDto);
  }

  /**
   * [📱 USER APP] Get list of all saved delivery addresses for a user
   * GET /addresses
   */
  @Get()
  findAllByUser(@CurrUser() user: any, @Query('userId') userId?: string) {
    const targetUserId = user.role === 'admin' && userId ? userId : user._id.toString();
    return this.addressesService.findAllByUser(targetUserId);
  }

  /**
   * [📱 USER APP] Get single saved address detail by ID
   * GET /addresses/:id
   */
  @Get(':id')
  findOne(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'admin' && userId ? userId : user._id.toString();
    return this.addressesService.findOne(id, targetUserId);
  }

  /**
   * [📱 USER APP] Update a saved address
   * PATCH /addresses/:id
   */
  @Patch(':id')
  update(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'admin' && userId ? userId : user._id.toString();
    return this.addressesService.update(id, targetUserId, updateAddressDto);
  }

  /**
   * [📱 USER APP] Delete a saved address
   * DELETE /addresses/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'admin' && userId ? userId : user._id.toString();
    return this.addressesService.remove(id, targetUserId);
  }
}
