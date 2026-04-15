import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  create(@CurrUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.ordersService.checkout(user._id.toString(), checkoutDto);
  }

  @Get('my-orders')
  findAll(@CurrUser() user: any) {
    return this.ordersService.getUserOrders(user._id.toString());
  }

  @Get('restaurant/:restaurantId')
  findRestaurantOrders(@Param('restaurantId') restaurantId: string) {
    return this.ordersService.getRestaurantOrders(restaurantId);
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

  @Post(':id/auto-assign')
  autoAssign(@Param('id') id: string) {
    return this.ordersService.autoAssignDriver(id);
  }
}
