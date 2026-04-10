import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get(':userId')
  getCart(@Param('userId') userId: string) {
    return this.cartsService.getCart(userId);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  addToCart(@Body() addToCartDto: AddToCartDto) {
    return this.cartsService.addToCart(addToCartDto);
  }

  @Patch('item/:itemId')
  updateCartItem(@Param('itemId') itemId: string, @Body() updateCartItemDto: UpdateCartItemDto) {
    return this.cartsService.updateCartItem(itemId, updateCartItemDto);
  }

  @Delete('item/:itemId')
  removeCartItem(@Param('itemId') itemId: string, @Query('userId') userId: string) {
    return this.cartsService.removeItem(userId, itemId);
  }

  @Delete('clear/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@Param('userId') userId: string) {
    return this.cartsService.clearCart(userId);
  }
}
