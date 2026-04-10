import { Controller, Get, Post, Body, Patch, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { MarkDeliveredDto } from './dto/mark-delivered.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  checkout(@Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(checkoutDto);
  }

  @Get('user/:userId')
  getUserOrders(@Param('userId') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantOrders(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.getRestaurantOrders(restaurantId);
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  updateOrderStatus(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    // Note: Vendor or Admin typically calls this to flow PENDING -> ACCEPTED -> PREPARING
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto);
  }

  @Post(':id/assign-driver')
  @HttpCode(HttpStatus.OK)
  assignDriver(@Param('id') id: string, @Body() assignDriverDto: AssignDriverDto) {
    return this.ordersService.assignDriver(id, assignDriverDto);
  }

  @Patch(':id/deliver')
  @HttpCode(HttpStatus.OK)
  markDelivered(@Param('id') id: string, @Body() markDeliveredDto: MarkDeliveredDto) {
    return this.ordersService.markDelivered(id, markDeliveredDto.driverId);
  }

  @Post(':id/auto-assign')
  @HttpCode(HttpStatus.OK)
  autoAssignDriver(@Param('id') id: string) {
    return this.ordersService.autoAssignDriver(id);
  }
}
