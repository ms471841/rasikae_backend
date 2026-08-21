import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

/**
 * ============================================================================
 * SHOPPING CART CONTROLLER
 * Handles Customer Cart Persistence, Item Addition, Quantity Updates & Clears
 * ============================================================================
 */
@Controller('carts')
@UseGuards(FirebaseAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Get active cart for logged-in customer
   * GET /carts/my-cart
   */
  @Get('my-cart')
  getCart(@CurrUser() user: any) {
    return this.cartsService.getCart(user._id.toString());
  }

  /**
   * [📱 USER APP] Add menu item / variant / addons to active cart
   * POST /carts/add
   */
  @Post('add')
  @HttpCode(HttpStatus.OK)
  addToCart(@CurrUser() user: any, @Body() addToCartDto: AddToCartDto) {
    return this.cartsService.addToCart(user._id.toString(), addToCartDto);
  }

  /**
   * [📱 USER APP] Update quantity or modifiers of a cart item
   * PATCH /carts/item/:itemId
   */
  @Patch('item/:itemId')
  updateCartItem(
    @CurrUser() user: any,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateCartItem(
      user._id.toString(),
      itemId,
      updateCartItemDto,
    );
  }

  /**
   * [📱 USER APP] Remove a specific item from active cart
   * DELETE /carts/item/:itemId
   */
  @Delete('item/:itemId')
  removeCartItem(@CurrUser() user: any, @Param('itemId') itemId: string) {
    return this.cartsService.removeItem(user._id.toString(), itemId);
  }

  /**
   * [📱 USER APP] Clear all items from active cart
   * DELETE /carts/clear
   */
  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@CurrUser() user: any) {
    return this.cartsService.clearCart(user._id.toString());
  }
}
