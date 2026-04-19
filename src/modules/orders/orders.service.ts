import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus, OrderItem } from './schemas/order.schema';
import { CheckoutDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartsService } from '../carts/carts.service';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';

import { AssignDriverDto } from './dto/assign-driver.dto';
import { DriversService } from '../drivers/drivers.service';
import { WalletsService } from '../wallets/wallets.service';
import { SocketsGateway } from '../sockets/sockets.gateway';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { Transaction, TransactionDocument, TransactionType } from '../payments/schemas/transaction.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private readonly cartsService: CartsService,
    private readonly driversService: DriversService,
    private readonly walletsService: WalletsService,
    private readonly socketsGateway: SocketsGateway,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async checkout(userId: string, checkoutDto: CheckoutDto): Promise<{ orders: OrderDocument[], paymentData?: any }> {
    const { deliveryAddress, paymentMethod, idempotencyKey } = checkoutDto;

    // 1. Idempotency Check: Check if orders already exist for this key
    const existingOrders = await this.orderModel.find({ userId: new Types.ObjectId(userId), idempotencyKey }).exec();
    if (existingOrders.length > 0) {
      // Find associated payment data if it's an online payment
      let paymentData;
      if (paymentMethod !== 'COD') {
        const transaction = await this.transactionModel.findOne({ 
          userId: new Types.ObjectId(userId),
          $or: [
            { orderId: { $in: existingOrders.map(o => o._id) } },
            // Fallback for multicart where orderId might not be directly on transaction
            // in some edge cases if we linked it differently
          ]
        }).sort({ createdAt: -1 }).exec();

        if (transaction) {
          paymentData = {
            razorpayOrderId: transaction.razorpayOrderId,
            amount: transaction.amount, // Already in Paise
            currency: 'INR',
            keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
          };
        }
      }
      return { orders: existingOrders, paymentData };
    }

    // Check Global Settings (Maintenance Mode and Min Order Value)
    const settings = await this.settingsService.getSettings();
    if (settings.isMaintenanceMode) {
      throw new BadRequestException(settings.maintenanceMessage || 'Platform is currently under maintenance.');
    }

    // Fetch the user's cart
    const cart = await this.cartsService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      // If order doesn't exist but cart is empty, it might have been cleared by a previous successful but unindexed/race-conditioned request
      // But usually idempotency check above catches it.
      throw new BadRequestException('Cannot place an order with an empty cart');
    }

    // Group items by restaurant
    const itemsByRestaurant = new Map<string, any[]>();
    for (const item of cart.items) {
      const restaurantIdStr = typeof item.restaurantId === 'object' && (item.restaurantId as any)._id 
        ? (item.restaurantId as any)._id.toString() 
        : item.restaurantId.toString();
        
      let restaurantItems = itemsByRestaurant.get(restaurantIdStr);
      if (!restaurantItems) {
        restaurantItems = [];
        itemsByRestaurant.set(restaurantIdStr, restaurantItems);
      }
      const menuItemIdStr = typeof item.menuItemId === 'object' && (item.menuItemId as any)._id 
        ? (item.menuItemId as any)._id.toString() 
        : item.menuItemId.toString();

      // Fetch menu item name for the snapshot
      const menuItem = await this.menuItemModel.findById(menuItemIdStr).exec();
      const itemName = menuItem ? menuItem.name : 'Unknown Item';

      restaurantItems.push({
        menuItemId: new Types.ObjectId(menuItemIdStr),
        name: itemName,
        quantity: item.quantity,
        price: item.price,
        variant: item.variant,
        addons: item.addons,
        packagingCharge: menuItem?.packagingChargeInPaise ?? 0,
        totalItemPrice: item.totalItemPrice,
        originalPrice: menuItem?.discountPrice ?? item.price, // discountPrice is used as MRP/Original in this schema
      });
    }

    const createdOrders: OrderDocument[] = [];

    // Create an order per restaurant
    for (const [restaurantIdStr, items] of itemsByRestaurant.entries()) {
      const subTotal = items.reduce((acc, current) => acc + current.totalItemPrice, 0);

      if (subTotal < settings.minOrderValue) {
        throw new BadRequestException(`Order from restaurant must be at least ₹${settings.minOrderValue}`);
      }

      const staticTax = Math.round(subTotal * settings.taxPercentage); // Total Tax
      const cgst = Math.round(staticTax / 2);
      const sgst = staticTax - cgst; // Remaining goes to SGST (handles odd paise)

      const staticDeliveryFee = settings.deliveryBaseFee;
      const packagingFee = items.reduce((acc, current) => acc + (current.packagingCharge || 0) * current.quantity, 0);
      
      const discountAmount = items.reduce((acc, current) => {
        const savings = (current.originalPrice > current.price) ? (current.originalPrice - current.price) * current.quantity : 0;
        return acc + savings;
      }, 0);

      const totalAmount = subTotal + staticTax + staticDeliveryFee + packagingFee;

      const orderData = {
        userId: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantIdStr),
        items: items,
        deliveryAddress,
        subTotal,
        tax: staticTax,
        cgst,
        sgst,
        deliveryFee: staticDeliveryFee,
        packagingFee,
        discountAmount,
        totalAmount,
        status: OrderStatus.PENDING,
        paymentMethod,
        paymentStatus: 'PENDING',
        idempotencyKey,
      };

      const createdOrder = new this.orderModel(orderData);
      await createdOrder.save();
      createdOrders.push(createdOrder);
    }

    // Clear cart upon successful order placement
    await this.cartsService.clearCart(userId);

    // If online payment (not COD), generate Razorpay Order for the total amount
    if (paymentMethod !== 'COD') {
      const grandTotal = createdOrders.reduce((acc, order) => acc + order.totalAmount, 0);
      const paymentData = await this.paymentsService.createRazorpayOrder(
        userId,
        grandTotal,
        TransactionType.ORDER_PAYMENT,
        createdOrders.length === 1 ? createdOrders[0]._id.toString() : undefined // Link total if single restaurant
      );
      
      // Notify Restaurant Owners about NEW order
      for (const order of createdOrders) {
        const restaurant = await this.restaurantModel.findById(order.restaurantId).populate('ownerId').exec();
        if (restaurant && restaurant.ownerId) {
          const owner = restaurant.ownerId as any;
          
          // Socket.io real-time update
          if (owner.firebaseUid) {
            this.socketsGateway.emitNewOrder(owner.firebaseUid, order.toJSON ? order.toJSON() : order);
          }

          // Push Notification
          await this.notificationsService.sendToUser(owner._id.toString(), {
            title: 'New Order Received! 🍔',
            body: `You have a new order (#${order._id.toString().slice(-6)}) for ₹${order.totalAmount}`,
            data: { orderId: order._id.toString(), type: 'NEW_ORDER' }
          });
        }
      }

      return { orders: createdOrders, paymentData };
    }

    // Notify Restaurant Owners about NEW COD order
    for (const order of createdOrders) {
      const restaurant = await this.restaurantModel.findById(order.restaurantId).populate('ownerId').exec();
      if (restaurant && restaurant.ownerId) {
        const owner = restaurant.ownerId as any;

        // Socket.io real-time update
        if (owner.firebaseUid) {
          this.socketsGateway.emitNewOrder(owner.firebaseUid, order.toJSON ? order.toJSON() : order);
        }

        // Push Notification
        await this.notificationsService.sendToUser(owner._id.toString(), {
          title: 'New COD Order Received! 💵',
          body: `New COD order (#${order._id.toString().slice(-6)}) for ₹${order.totalAmount}`,
          data: { orderId: order._id.toString(), type: 'NEW_ORDER' }
        });
      }
    }

    return { orders: createdOrders };
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId: new Types.ObjectId(userId) })
      .populate('restaurantId', 'name logo coverImages rating address')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getRestaurantOrders(restaurantId: string): Promise<Order[]> {
    return this.orderModel.find({ restaurantId: new Types.ObjectId(restaurantId) })
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDriverOrders(driverId: string): Promise<Order[]> {
    return this.orderModel.find({ 
      driverId: new Types.ObjectId(driverId),
      status: { $in: [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] }
    })
    .populate('restaurantId', 'name logo address phone')
    .populate('userId', 'name phone email')
    .sort({ createdAt: -1 })
    .exec();
  }

  async getVendorOrders(ownerId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    
    // 1. Find all restaurants owned by the vendor
    const restaurants = await this.restaurantModel.find({ ownerId: new Types.ObjectId(ownerId) }).select('_id').exec();
    const restaurantIds = restaurants.map(r => r._id);

    if (restaurantIds.length === 0) {
      return { data: [], totalItems: 0, totalPages: 0, currentPage: page };
    }

    // 2. Find orders for these restaurants
    const baseMatch = { restaurantId: { $in: restaurantIds } };
    
    const [data, totalItems] = await Promise.all([
      this.orderModel.find(baseMatch)
        .populate('restaurantId', 'name logo address')
        .populate('userId', 'name phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(baseMatch).exec()
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      totalItems,
      totalPages,
      currentPage: page
    };
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id)
      .populate('restaurantId', 'name logo coverImages rating address')
      .populate('userId', 'name phone email')
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateOrderStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status: updateOrderStatusDto.status },
      { returnDocument: 'after' }
    ).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    // 1. Emit to dynamic order room (for active detail screens)
    this.socketsGateway.emitOrderStatus(id, updateOrderStatusDto.status);

    // 2. Emit to vendor room (to sync list view across devices)
    const restaurant = await this.restaurantModel.findById(order.restaurantId).populate('ownerId').exec();
    if (restaurant && restaurant.ownerId) {
      const owner = restaurant.ownerId as any;
      if (owner.firebaseUid) {
        this.socketsGateway.emitOrderStatusToVendor(owner.firebaseUid, id, updateOrderStatusDto.status);
      }
    }

    // 3. Notify Customer about Status Change (Push Notification)
    await this.notificationsService.sendToUser(order.userId.toString(), {
      title: 'Order Update 🍕',
      body: `Your order status is now: ${updateOrderStatusDto.status}`,
      data: { orderId: id, status: updateOrderStatusDto.status }
    });
    
    return order;
  }

  async assignDriver(id: string, assignDriverDto: AssignDriverDto): Promise<Order> {
    const { driverId } = assignDriverDto;

    // Verify driver exists and is available
    const driver = await this.driversService.findOne(driverId);
    if (!driver.isAvailable) {
      throw new BadRequestException(`Driver with ID ${driverId} is currently not available.`);
    }

    // Update order with driverId and bump status
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { 
        driverId: new Types.ObjectId(driverId),
        status: OrderStatus.PREPARING // Auto progression
      },
      { new: true }
    ).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Notify Customer
    await this.notificationsService.sendToUser(order.userId.toString(), {
      title: 'Driver Assigned! 🛵',
      body: 'A driver has been assigned to your order and is on the way.',
      data: { orderId: id, status: 'DRIVER_ASSIGNED' }
    });

    // Notify Driver (Corrected to use userId from populated driver)
    const driverUserId = (driver.userId as any)._id?.toString() || driver.userId.toString();
    await this.notificationsService.sendToUser(driverUserId, {
      title: 'New Delivery Assigned! 📦',
      body: `You have a new delivery at ${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
      data: { orderId: id, type: 'NEW_DELIVERY' }
    });
    
    // Live Socket sync
    const driverUser = driver.userId as any;
    if (driverUser && driverUser.firebaseUid) {
      this.socketsGateway.emitNewOrderToDriver(driverUser.firebaseUid, order);
    }

    return order;
  }

  async markDelivered(id: string, driverId: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (!order.driverId || order.driverId.toString() !== driverId) {
      throw new BadRequestException('You are not authorized to mark this order as delivered. Is it assigned to you?');
    }

    if (order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException(`Cannot deliver an order in ${order.status} status.`);
    }

    order.status = OrderStatus.DELIVERED;
    await order.save();

    // Trigger phase 2 earning mechanisms securely!
    await this.walletsService.processDeliveryEarnings(
      driverId, 
      id, 
      order.deliveryFee || 0, // Injected standard delivery cut 
      order.totalAmount,     // Used if the payment is COD
      order.paymentMethod
    );

    // Trigger Admin/Platform commission and Restaurant Earnings
    await this.walletsService.processRestaurantEarnings(
      order.restaurantId.toString(),
      id,
      order.subTotal
    );

    // Notify Customer about Delivery
    await this.notificationsService.sendToUser(order.userId.toString(), {
      title: 'Order Delivered! 🍕',
      body: 'Your Rasikae treat has been delivered. Enjoy your meal!',
      data: { orderId: id, status: 'DELIVERED' }
    });

    return order;
  }

  async autoAssignDriver(id: string, maxDistance: number = 10000): Promise<{ order: Order, driverId?: string, message: string }> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

    if (order.driverId) {
      throw new BadRequestException('Order already has an assigned driver.');
    }

    const restaurant = await this.restaurantModel.findById(order.restaurantId).exec();
    if (!restaurant) throw new NotFoundException('Restaurant not found for this order.');
    
    if (!restaurant.location || !restaurant.location.coordinates || restaurant.location.coordinates.length < 2) {
      throw new BadRequestException('Restaurant does not have valid GPS coordinates defined.');
    }

    const [lng, lat] = restaurant.location.coordinates;
    const nearbyDrivers = await this.driversService.findNearbyAvailable(lng, lat, maxDistance);

    if (nearbyDrivers.length === 0) {
      return { order, message: 'No available drivers found within range.' };
    }

    // Driver array sorted by $nearSphere, so 0 is nearest
    const matchedDriver = nearbyDrivers[0] as any; 

    order.driverId = matchedDriver._id as any; 
    order.status = OrderStatus.PREPARING;
    await order.save();

    const matchedDriverId = matchedDriver._id.toString();

    // Notify Customer
    await this.notificationsService.sendToUser(order.userId.toString(), {
      title: 'Driver Matched! 🛵',
      body: 'We found a driver for your order!',
      data: { orderId: id, status: 'DRIVER_ASSIGNED' }
    });

    // Notify Driver
    const driverUserId = (matchedDriver.userId as any)._id?.toString() || matchedDriver.userId.toString();
    await this.notificationsService.sendToUser(driverUserId, {
      title: 'Auto-Assigned New Delivery! 📦',
      body: `Nearby delivery assigned at ${order.deliveryAddress.street}`,
      data: { orderId: id, type: 'NEW_DELIVERY' }
    });

    return { 
      order, 
      driverId: matchedDriverId,
      message: 'Driver successfully matched and auto-assigned!' 
    };
  }
}
