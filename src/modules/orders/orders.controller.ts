import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';
import { UsersService } from '../users/users.service';

import { DriversService } from '../drivers/drivers.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly driversService: DriversService,
  ) {}

  @Post('checkout')
  create(@CurrUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(user._id.toString(), checkoutDto);
  }

  @Get('my-orders')
  findAll(@CurrUser() user: any) {
    return this.ordersService.getUserOrders(user._id.toString());
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const parsedPage = Math.max(1, page ? parseInt(page, 10) : 1);
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getAllOrders(parsedPage, parsedLimit, status);
  }

  @Get('restaurant/:restaurantId')
  findRestaurantOrders(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.getRestaurantOrders(restaurantId);
  }

  @Get('vendor/all')
  async findVendorOrders(
    @CurrUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const uid = user.uid || user.firebaseUid;
    const mongoUser = await this.usersService.getProfile(uid);
    const parsedPage = Math.max(1, page ? parseInt(page, 10) : 1);
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getVendorOrders(mongoUser._id.toString(), parsedPage, parsedLimit);
  }

  @Get('driver/all')
  async findDriverOrders(@CurrUser() user: any) {
    const mongoUser = await this.usersService.getProfile(user.uid || user.firebaseUid);
    const driver = await this.driversService.findByUserId(mongoUser._id.toString());
    return this.ordersService.getDriverOrders(driver._id.toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  update(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto);
  }

  @Patch(':id/assign-driver')
  assignDriver(@Param('id') id: string, @Body() assignDriverDto: AssignDriverDto) {
    return this.ordersService.assignDriver(id, assignDriverDto);
  }

  @Patch(':id/delivered')
  async markDelivered(@Param('id') id: string, @CurrUser() user: any) {
    const mongoUser = await this.usersService.getProfile(user.uid || user.firebaseUid);
    
    if (mongoUser.role === 'admin') {
      return this.ordersService.markDelivered(id);
    }

    const driver = await this.driversService.findByUserId(mongoUser._id.toString());
    return this.ordersService.markDelivered(id, driver._id.toString());
  }

  @Post(':id/auto-assign')
  autoAssign(@Param('id') id: string) {
    return this.ordersService.autoAssignDriver(id);
  }
}
