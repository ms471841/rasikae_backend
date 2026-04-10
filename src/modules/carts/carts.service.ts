import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  private calculateCartTotal(cart: CartDocument): number {
    return cart.items.reduce((total, item) => total + item.totalItemPrice, 0);
  }

  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], totalPrice: 0 });
      await cart.save();
    }
    return cart;
  }

  async addToCart(addToCartDto: AddToCartDto): Promise<Cart> {
    const { userId, menuItemId, quantity, variantName, addonNames } = addToCartDto;

    const menuItem = await this.menuItemModel.findById(menuItemId).exec();
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }
    if (!menuItem.isAvailable) {
      throw new BadRequestException('This item is currently unavailable');
    }

    let variantPrice = 0;
    let selectedVariant: { name: string; price: number } | undefined;
    if (variantName) {
      const variant = menuItem.variants.find(v => v.name === variantName);
      if (!variant) {
        throw new BadRequestException(`Variant ${variantName} not found on this item`);
      }
      variantPrice = variant.price;
      selectedVariant = { name: variant.name, price: variant.price };
    }

    let addonsPrice = 0;
    const selectedAddons: { name: string; price: number }[] = [];
    if (addonNames && addonNames.length > 0) {
      for (const addonName of addonNames) {
        const addon = menuItem.addons.find(a => a.name === addonName);
        if (!addon) {
          throw new BadRequestException(`Addon ${addonName} not found on this item`);
        }
        addonsPrice += addon.price;
        selectedAddons.push({ name: addon.name, price: addon.price });
      }
    }

    const basePrice = menuItem.discountPrice || menuItem.price;
    const totalItemPrice = (basePrice + variantPrice + addonsPrice) * quantity;

    const cart = await this.getCart(userId);

    // Check if exactly same item configuration exists to just increment quantity
    const existingItemIndex = cart.items.findIndex(item => {
      const sameMenuItem = item.menuItemId.toString() === menuItemId;
      const sameVariant = (item.variant?.name || null) === (selectedVariant?.name || null);
      const itemAddonNames = (item.addons || []).map(a => a.name).sort().join(',');
      const newAddonNames = selectedAddons.map(a => a.name).sort().join(',');
      const sameAddons = itemAddonNames === newAddonNames;

      return sameMenuItem && sameVariant && sameAddons;
    });

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalItemPrice += totalItemPrice;
    } else {
      cart.items.push({
        _id: new Types.ObjectId(),
        menuItemId: menuItem._id as Types.ObjectId,
        restaurantId: menuItem.restaurantId,
        quantity,
        price: basePrice,
        variant: selectedVariant,
        addons: selectedAddons,
        totalItemPrice,
      } as any); // Cast as any to bypass Types.ObjectId constructor for the union type
    }

    cart.totalPrice = this.calculateCartTotal(cart);
    return cart.save();
  }

  async updateCartItem(itemId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart> {
    const { userId, quantity } = updateCartItemDto;
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemIndex = cart.items.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    const item = cart.items[itemIndex];
    const singleUnitPrice = item.totalItemPrice / item.quantity; // Best way to retrieve the unit price including variants/addons
    
    item.quantity = quantity;
    item.totalItemPrice = singleUnitPrice * quantity;

    cart.totalPrice = this.calculateCartTotal(cart);
    return cart.save();
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter(i => i._id.toString() !== itemId);
    cart.totalPrice = this.calculateCartTotal(cart);
    return cart.save();
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartModel.findOneAndDelete({ userId }).exec();
  }
}
