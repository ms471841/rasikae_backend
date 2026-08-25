import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
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

/**
 * ============================================================================
 * ORDERS MANAGEMENT CONTROLLER
 * Handles Order Placement, Status Lifecycle, Driver Assignment & Invoices
 * ============================================================================
 */
@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly driversService: DriversService,
    private readonly invoicesService: InvoicesService,
  ) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs (Customer Order Flow)
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Place a new COD or direct order
   * POST /orders/checkout
   */
  @Post('checkout')
  create(@CurrUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(user._id.toString(), checkoutDto);
  }

  /**
   * [📱 USER APP] Get order history for the logged-in customer
   * GET /orders/my-orders?page=1&limit=20
   */
  @Get('my-orders')
  findAll(
    @CurrUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Math.max(1, page ? parseInt(page, 10) : 1);
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getUserOrders(
      user._id.toString(),
      parsedPage,
      parsedLimit,
    );
  }

  /**
   * [📱 USER APP] Step 1: Initiate Razorpay payment session
   * POST /orders/initiate-payment
   */
  @Post('initiate-payment')
  initiatePayment(@CurrUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.initiatePayment(user._id.toString(), checkoutDto);
  }

  /**
   * [📱 USER APP] Step 2: Confirm Razorpay payment signature & create order
   * POST /orders/confirm-payment
   */
  @Post('confirm-payment')
  confirmPayment(
    @CurrUser() user: any,
    @Body()
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return this.ordersService.confirmPayment(
      user._id.toString(),
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
  }

  /**
   * [📱 USER APP / 👑 ADMIN / 🍳 VENDOR / 🛵 DRIVER] Download Order Invoice PDF
   * GET /orders/:id/invoice
   */
  @Get(':id/invoice')
  async getInvoice(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const order = await this.ordersService.getOrderById(id, user);
    const pdfBuffer = await this.invoicesService.generateInvoicePdf(order);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice_${id.slice(-6)}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Fetch all system orders with optional status filter & pagination
   * GET /orders/all?page=1&limit=20&status=PENDING
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin', 'sub_admin')
  async findAllOrders(
    @CurrUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const parsedPage = Math.max(1, page ? parseInt(page, 10) : 1);
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getAllOrders(user, parsedPage, parsedLimit, status);
  }

  /**
   * [📱 USER APP / 👑 ADMIN / 🍳 VENDOR / 🛵 DRIVER] Get single order details by ID
   * GET /orders/:id
   */
  @Get(':id')
  findOne(@CurrUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user);
  }

  /**
   * [👑 ADMIN PANEL / 🍳 VENDOR / 🛵 DRIVER] Update order status (ACCEPTED, PREPARING, READY, CANCELLED, etc.)
   * PATCH /orders/:id/status
   */
  @Patch(':id/status')
  update(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto, user);
  }

  /**
   * [👑 ADMIN PANEL] Manually assign a driver to an order
   * PATCH /orders/:id/assign-driver
   */
  @Patch(':id/assign-driver')
  assignDriver(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() assignDriverDto: AssignDriverDto,
  ) {
    return this.ordersService.assignDriver(id, assignDriverDto, user);
  }

  /**
   * [👑 ADMIN PANEL] Trigger AI Auto-Match driver assignment
   * POST /orders/:id/auto-assign
   */
  @Post(':id/auto-assign')
  autoAssign(@CurrUser() user: any, @Param('id') id: string) {
    return this.ordersService.autoAssignDriver(id, user);
  }

  // --------------------------------------------------------------------------
  // 🍳 VENDOR APP APIs
  // --------------------------------------------------------------------------

  /**
   * [🍳 VENDOR APP] Get orders for a specific restaurant owned by the vendor
   * GET /orders/restaurant/:restaurantId
   */
  @Get('restaurant/:restaurantId')
  findRestaurantOrders(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.ordersService.getRestaurantOrders(restaurantId, user);
  }

  /**
   * [🍳 VENDOR APP] Get all orders across all restaurants owned by the vendor
   * GET /orders/vendor/all?page=1&limit=20
   */
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
    return this.ordersService.getVendorOrders(
      mongoUser._id.toString(),
      parsedPage,
      parsedLimit,
    );
  }

  // --------------------------------------------------------------------------
  // 🛵 DRIVER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [🛵 DRIVER APP] Get assigned orders for the logged-in driver
   * GET /orders/driver/all
   */
  @Get('driver/all')
  async findDriverOrders(@CurrUser() user: any) {
    const mongoUser = await this.usersService.getProfile(
      user.uid || user.firebaseUid,
    );
    const driver = await this.driversService.findByUserId(
      mongoUser._id.toString(),
    );
    return this.ordersService.getDriverOrders(driver._id.toString());
  }

  /**
   * [🛵 DRIVER APP / 👑 ADMIN PANEL] Mark an order as DELIVERED
   * PATCH /orders/:id/delivered
   */
  @Patch(':id/delivered')
  async markDelivered(@Param('id') id: string, @CurrUser() user: any) {
    const mongoUser = await this.usersService.getProfile(
      user.uid || user.firebaseUid,
    );

    if (mongoUser.role === 'admin') {
      return this.ordersService.markDelivered(id);
    }

    const driver = await this.driversService.findByUserId(
      mongoUser._id.toString(),
    );
    return this.ordersService.markDelivered(id, driver._id.toString());
  }
}
