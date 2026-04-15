import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('carts')
@UseGuards(FirebaseAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('my-cart')
  getCart(@CurrUser() user: any) {
    return this.cartsService.getCart(user._id.toString());
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  addToCart(@CurrUser() user: any, @Body() addToCartDto: AddToCartDto) {
    return this.cartsService.addToCart(user._id.toString(), addToCartDto);
  }

  @Patch('item/:itemId')
  updateCartItem(
    @CurrUser() user: any,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    return this.cartsService.updateCartItem(user._id.toString(), itemId, updateCartItemDto);
  }

  @Delete('item/:itemId')
  removeCartItem(@CurrUser() user: any, @Param('itemId') itemId: string) {
    return this.cartsService.removeItem(user._id.toString(), itemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@CurrUser() user: any) {
    return this.cartsService.clearCart(user._id.toString());
  }
}
