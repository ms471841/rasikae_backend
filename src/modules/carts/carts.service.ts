import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SocketsGateway } from '../sockets/sockets.gateway';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @Inject(forwardRef(() => SocketsGateway))
    private readonly socketsGateway: SocketsGateway,
    private readonly settingsService: SettingsService,
  ) {}

  private async calculateCartBilling(cart: CartDocument): Promise<{
    subtotal: number;
    packagingFee: number;
    deliveryFee: number;
    tax: number;
    cgst: number;
    sgst: number;
    total: number;
  }> {
    const subtotal = cart.items.reduce(
      (total, item) => total + item.totalItemPrice,
      0,
    );

    if (cart.items.length === 0) {
      return {
        subtotal: 0,
        packagingFee: 0,
        deliveryFee: 0,
        tax: 0,
        cgst: 0,
        sgst: 0,
        total: 0,
      };
    }

    // Packaging fee from menu item packaging charges
    const packagingFee = cart.items.reduce((acc, item) => {
      const itemPkg =
        (item.menuItemId as any)?.packagingChargeInPaise ||
        (item.menuItemId as any)?.packagingCharge ||
        0;
      return acc + itemPkg * item.quantity;
    }, 0);

    const settings = await this.settingsService.getSettings();

    // Tax calculation
    const tax = Math.round(subtotal * (settings?.taxPercentage ?? 0.05));
    const cgst = Math.round(tax / 2);
    const sgst = tax - cgst;

    // Delivery Fee calculation
    const restaurant = cart.items[0]?.restaurantId as any;
    let deliveryFee = 0;
    if (!restaurant?.isFreeDelivery) {
      const zone = restaurant?.zoneId;
      const baseDeliveryFee =
        zone && zone.baseDeliveryFeeInPaise != null
          ? zone.baseDeliveryFeeInPaise
          : (settings?.deliveryBaseFee ?? 4000);
      const surgeFee = zone && zone.surgeFeeInPaise ? zone.surgeFeeInPaise : 0;
      deliveryFee = baseDeliveryFee + surgeFee;
    }

    const total = Math.max(0, subtotal + packagingFee + deliveryFee + tax);

    return {
      subtotal,
      packagingFee,
      deliveryFee,
      tax,
      cgst,
      sgst,
      total,
    };
  }

  private async syncAndSaveBilling(cart: CartDocument): Promise<CartDocument> {
    const billing = await this.calculateCartBilling(cart);
    cart.totalPrice = billing.subtotal;
    cart.subtotal = billing.subtotal;
    cart.packagingFee = billing.packagingFee;
    cart.deliveryFee = billing.deliveryFee;
    cart.tax = billing.tax;
    cart.cgst = billing.cgst;
    cart.sgst = billing.sgst;
    cart.total = billing.total;
    await cart.save();
    return cart;
  }

  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.getPopulatedCart(userId);

    if (!cart) {
      cart = new this.cartModel({
        userId,
        items: [],
        totalPrice: 0,
        subtotal: 0,
        packagingFee: 0,
        deliveryFee: 0,
        tax: 0,
        cgst: 0,
        sgst: 0,
        total: 0,
      });
      await cart.save();
      return cart;
    }

    // Refresh billing dynamically in case settings or zone prices updated
    await this.syncAndSaveBilling(cart);
    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { menuItemId, quantity, variantName, addonNames } = addToCartDto;

    const menuItem = await this.menuItemModel.findById(menuItemId).exec();
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }
    if (!menuItem.isAvailable) {
      throw new BadRequestException('This item is currently unavailable');
    }

    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], totalPrice: 0 });
    }

    // Cross-Restaurant Validation
    if (cart.items.length > 0) {
      const existingRestaurantId = cart.items[0].restaurantId.toString();
      const newRestaurantId = menuItem.restaurantId.toString();

      if (existingRestaurantId !== newRestaurantId) {
        throw new ConflictException({
          message: 'Your cart contains items from another restaurant.',
          code: 'MIXED_RESTAURANT',
          currentRestaurantId: existingRestaurantId,
          newRestaurantId: newRestaurantId,
        });
      }
    }

    let variantPrice = 0;
    let selectedVariant: { name: string; price: number } | undefined;
    if (variantName) {
      const variant = menuItem.variants.find((v) => v.name === variantName);
      if (!variant) {
        throw new BadRequestException(
          `Variant ${variantName} not found on this item`,
        );
      }
      variantPrice = variant.price;
      selectedVariant = { name: variant.name, price: variant.price };
    }

    let addonsPrice = 0;
    const selectedAddons: { name: string; price: number; groupName: string }[] =
      [];
    if (addonNames && addonNames.length > 0) {
      for (const addonName of addonNames) {
        let foundAddon: any = null;
        let foundGroupName = '';

        for (const group of (menuItem as any).addonGroups) {
          const option = group.options.find((o: any) => o.name === addonName);
          if (option) {
            foundAddon = option;
            foundGroupName = group.name;
            break;
          }
        }

        if (!foundAddon) {
          throw new BadRequestException(
            `Addon ${addonName} not found on this item`,
          );
        }

        addonsPrice += foundAddon.price;
        selectedAddons.push({
          name: foundAddon.name,
          price: foundAddon.price,
          groupName: foundGroupName,
        });
      }
    }

    const basePrice = menuItem.price;
    const totalItemPrice = (basePrice + variantPrice + addonsPrice) * quantity;

    const existingItemIndex = cart.items.findIndex((item) => {
      const itemMenuId = item.menuItemId.toString();
      const sameMenuItem = itemMenuId === menuItemId;
      const sameVariant =
        (item.variant?.name || null) === (selectedVariant?.name || null);
      const itemAddonNames = (item.addons || [])
        .map((a) => a.name)
        .sort()
        .join(',');
      const newAddonNames = selectedAddons
        .map((a) => a.name)
        .sort()
        .join(',');
      const sameAddons = itemAddonNames === newAddonNames;

      return sameMenuItem && sameVariant && sameAddons;
    });

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalItemPrice += totalItemPrice;
    } else {
      cart.items.push({
        _id: new Types.ObjectId(),
        menuItemId: menuItem._id,
        restaurantId: menuItem.restaurantId,
        quantity,
        price: basePrice,
        variant: selectedVariant,
        addons: selectedAddons,
        totalItemPrice,
      });
    }

    await cart.save();
    const populatedCart = await this.getPopulatedCart(userId);
    if (!populatedCart) {
      throw new NotFoundException('Cart not found after update');
    }
    await this.syncAndSaveBilling(populatedCart);
    this.socketsGateway.emitCartUpdated(userId, populatedCart);
    return populatedCart;
  }

  private async getPopulatedCart(userId: string): Promise<CartDocument | null> {
    return this.cartModel
      .findOne({ userId })
      .populate({
        path: 'items.menuItemId',
        select:
          'name price discountPrice image isVeg description packagingChargeInPaise',
      })
      .populate({
        path: 'items.restaurantId',
        select:
          'name logo address rating isFreeDelivery zoneId isVeg deliveryTime',
        populate: {
          path: 'zoneId',
          select: 'baseDeliveryFeeInPaise surgeFeeInPaise name',
        },
      })
      .exec();
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const { quantity } = updateCartItemDto;
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const itemIndex = cart.items.findIndex((i) => i._id.toString() === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart');
    }

    const item = cart.items[itemIndex];
    const singleUnitPrice = item.totalItemPrice / item.quantity;

    item.quantity = quantity;
    item.totalItemPrice = singleUnitPrice * quantity;

    await cart.save();
    const populatedCart = await this.getPopulatedCart(userId);
    if (!populatedCart) {
      throw new NotFoundException('Cart not found after update');
    }
    await this.syncAndSaveBilling(populatedCart);
    this.socketsGateway.emitCartUpdated(userId, populatedCart);
    return populatedCart;
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    await cart.save();
    const populatedCart = await this.getPopulatedCart(userId);
    if (populatedCart) {
      await this.syncAndSaveBilling(populatedCart);
      this.socketsGateway.emitCartUpdated(userId, populatedCart);
      return populatedCart;
    }
    const emptyCart = await this.getCart(userId);
    this.socketsGateway.emitCartUpdated(userId, emptyCart);
    return emptyCart;
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartModel.findOneAndDelete({ userId }).exec();
    this.socketsGateway.emitCartUpdated(userId, {
      userId,
      items: [],
      totalPrice: 0,
      subtotal: 0,
      packagingFee: 0,
      deliveryFee: 0,
      tax: 0,
      cgst: 0,
      sgst: 0,
      total: 0,
    });
  }
}
