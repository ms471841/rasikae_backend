import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
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
    if (user.role !== 'admin' && user._id.toString() !== createAddressDto.userId) {
      throw new ForbiddenException('You cannot create an address for another user');
    }
    return this.addressesService.create(createAddressDto);
  }

  /**
   * [📱 USER APP] Get list of all saved delivery addresses for a user
   * GET /addresses?userId=...
   */
  @Get()
  findAllByUser(@CurrUser() user: any, @Query('userId') userId: string) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException('You cannot access addresses of another user');
    }
    return this.addressesService.findAllByUser(userId);
  }

  /**
   * [📱 USER APP] Get single saved address detail by ID
   * GET /addresses/:id?userId=...
   */
  @Get(':id')
  findOne(@CurrUser() user: any, @Param('id') id: string, @Query('userId') userId: string) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException('You cannot access addresses of another user');
    }
    return this.addressesService.findOne(id, userId);
  }

  /**
   * [📱 USER APP] Update a saved address
   * PATCH /addresses/:id?userId=...
   */
  @Patch(':id')
  update(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() updateAddressDto: UpdateAddressDto
  ) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException('You cannot modify addresses of another user');
    }
    return this.addressesService.update(id, userId, updateAddressDto);
  }

  /**
   * [📱 USER APP] Delete a saved address
   * DELETE /addresses/:id?userId=...
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Query('userId') userId: string
  ) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException('You cannot delete addresses of another user');
    }
    return this.addressesService.remove(id, userId);
  }
}
