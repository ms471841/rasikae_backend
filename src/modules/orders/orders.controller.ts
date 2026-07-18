import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, Res } from '@nestjs/common';
import * as express from 'express';
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

import { InvoicesService } from './invoices.service';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly driversService: DriversService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post('checkout')
  create(@CurrUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(user._id.toString(), checkoutDto);
  }

  @Get('my-orders')
  findAll(
    @CurrUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Math.max(1, page ? parseInt(page, 10) : 1);
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getUserOrders(user._id.toString(), parsedPage, parsedLimit);
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
  findRestaurantOrders(@CurrUser() user: any, @Param('restaurantId') restaurantId: string) {
    return this.ordersService.getRestaurantOrders(restaurantId, user);
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

  @Get(':id/invoice')
  async getInvoice(@CurrUser() user: any, @Param('id') id: string, @Res() res: express.Response) {
    const order = await this.ordersService.getOrderById(id, user);
    const pdfBuffer = await this.invoicesService.generateInvoicePdf(order);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice_${id.slice(-6)}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get(':id')
  findOne(@CurrUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user);
  }

  @Patch(':id/status')
  update(@CurrUser() user: any, @Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto, user);
  }

  @Patch(':id/assign-driver')
  assignDriver(@CurrUser() user: any, @Param('id') id: string, @Body() assignDriverDto: AssignDriverDto) {
    return this.ordersService.assignDriver(id, assignDriverDto, user);
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
  autoAssign(@CurrUser() user: any, @Param('id') id: string) {
    return this.ordersService.autoAssignDriver(id, user);
  }

  // ─── Online Payment Flow ────────────────────────────────────────────
  // Step 1: compute totals from cart, create Razorpay session (no DB order created)
  @Post('initiate-payment')
  initiatePayment(@CurrUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.initiatePayment(user._id.toString(), checkoutDto);
  }

  // Step 2: verify signature → create order → clear cart → notify restaurant
  @Post('confirm-payment')
  confirmPayment(
    @CurrUser() user: any,
    @Body() body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    return this.ordersService.confirmPayment(
      user._id.toString(),
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
  }

}

