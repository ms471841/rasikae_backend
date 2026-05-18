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
import { PaymentTransaction, PaymentTransactionDocument, TransactionType } from '../payments/schemas/transaction.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(PaymentTransaction.name) private transactionModel: Model<PaymentTransactionDocument>,
    private readonly cartsService: CartsService,
    private readonly driversService: DriversService,
    private readonly walletsService: WalletsService,
    private readonly socketsGateway: SocketsGateway,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  private extractId(id: any): string {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id instanceof Types.ObjectId) return id.toHexString();
    if (id._id) return id._id.toString();
    return id.toString();
  }


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
            { orderId: { $in: existingOrders.map((o: any) => o._id) } },
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

    // Notify Restaurant Owners about this COD order
    for (const order of createdOrders) {
      const restaurant = await this.restaurantModel.findById(order.restaurantId).populate('ownerId').exec();
      if (restaurant && restaurant.ownerId) {
        const owner = restaurant.ownerId as any;
        if (owner.firebaseUid) {
          await order.populate([
            { path: 'restaurantId', select: 'name logo address' },
            { path: 'userId', select: 'name phone email' }
          ]);
          this.socketsGateway.emitNewOrder(owner.firebaseUid, order.toJSON ? order.toJSON() : order);
        }
        await this.notificationsService.sendToUser(owner._id.toString(), {
          title: 'New COD Order Received! 💵',
          body: `New COD order (#${order._id.toString().slice(-6)}) for ₹${order.totalAmount / 100}`,
          data: { orderId: order._id.toString(), type: 'NEW_ORDER' }
        });
      }
    }

    await this.cartsService.clearCart(userId);
    return { orders: createdOrders };
  }

  // ─── Step 1 (Online payment): Compute totals, create Razorpay session, return it.
  // No order is created in the DB yet.
  async initiatePayment(userId: string, checkoutDto: CheckoutDto): Promise<any> {
    const { deliveryAddress, idempotencyKey } = checkoutDto;

    const settings = await this.settingsService.getSettings();
    if (settings.isMaintenanceMode) {
      throw new BadRequestException(settings.maintenanceMessage || 'Platform is currently under maintenance.');
    }

    const cart = await this.cartsService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cannot initiate payment with an empty cart');
    }

    // Build order snapshots (same logic as checkout, but no DB writes)
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

      const menuItem = await this.menuItemModel.findById(menuItemIdStr).exec();
      restaurantItems.push({
        menuItemId: menuItemIdStr,
        name: menuItem ? menuItem.name : 'Unknown Item',
        quantity: item.quantity,
        price: item.price,
        variant: item.variant,
        addons: item.addons,
        packagingCharge: menuItem?.packagingChargeInPaise ?? 0,
        totalItemPrice: item.totalItemPrice,
        originalPrice: menuItem?.discountPrice ?? item.price,
      });
    }

    const orderSnapshots: any[] = [];
    let grandTotal = 0;

    for (const [restaurantIdStr, items] of itemsByRestaurant.entries()) {
      const subTotal = items.reduce((acc, i) => acc + i.totalItemPrice, 0);

      if (subTotal < settings.minOrderValue) {
        throw new BadRequestException(`Order from restaurant must be at least ₹${settings.minOrderValue / 100}`);
      }

      const staticTax = Math.round(subTotal * settings.taxPercentage);
      const cgst = Math.round(staticTax / 2);
      const sgst = staticTax - cgst;
      const deliveryFee = settings.deliveryBaseFee;
      const packagingFee = items.reduce((acc, i) => acc + (i.packagingCharge || 0) * i.quantity, 0);
      const discountAmount = items.reduce((acc, i) => {
        return acc + ((i.originalPrice > i.price) ? (i.originalPrice - i.price) * i.quantity : 0);
      }, 0);
      const totalAmount = subTotal + staticTax + deliveryFee + packagingFee;

      grandTotal += totalAmount;
      orderSnapshots.push({
        restaurantId: restaurantIdStr,
        items,
        deliveryAddress,
        subTotal,
        tax: staticTax,
        cgst,
        sgst,
        deliveryFee,
        packagingFee,
        discountAmount,
        totalAmount,
        paymentMethod: 'ONLINE',
        idempotencyKey,
      });
    }

    // Create Razorpay session — store the full order snapshot in metadata
    const paymentData = await this.paymentsService.createRazorpayOrder(
      userId,
      grandTotal,
      TransactionType.ORDER_PAYMENT,
      undefined,
      undefined,
      { orderSnapshots, userId, idempotencyKey },
    );

    return paymentData;
  }

  // ─── Step 2 (Online payment): Verify signature → create orders → clear cart → notify restaurant.
  async confirmPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<{ orders: OrderDocument[] }> {
    // 1. Verify signature
    const isValid = await this.paymentsService.verifyPaymentSignature(
      razorpayOrderId, razorpayPaymentId, razorpaySignature,
    );
    if (!isValid) throw new BadRequestException('Invalid payment signature');

    // 2. Load transaction and snapshot
    const transaction = await this.transactionModel.findOne({ razorpayOrderId }).exec();
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status === 'SUCCESS') {
      // Idempotent: return orders that were already created
      const existingOrders = await this.orderModel.find({ idempotencyKey: transaction.metadata?.idempotencyKey }).exec();
      return { orders: existingOrders };
    }

    const { orderSnapshots } = transaction.metadata as any;
    if (!orderSnapshots?.length) throw new BadRequestException('No order data found in payment session');

    // 3. Create orders from snapshot
    const createdOrders: OrderDocument[] = [];
    for (const snap of orderSnapshots) {
      const order = new this.orderModel({
        userId: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(snap.restaurantId),
        items: snap.items.map((i: any) => ({ ...i, menuItemId: new Types.ObjectId(i.menuItemId) })),
        deliveryAddress: snap.deliveryAddress,
        subTotal: snap.subTotal,
        tax: snap.tax,
        cgst: snap.cgst,
        sgst: snap.sgst,
        deliveryFee: snap.deliveryFee,
        packagingFee: snap.packagingFee,
        discountAmount: snap.discountAmount,
        totalAmount: snap.totalAmount,
        status: OrderStatus.PENDING,
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
        idempotencyKey: snap.idempotencyKey,
      });
      await order.save();
      createdOrders.push(order);
    }

    // 4. Mark transaction as success
    transaction.status = 'SUCCESS' as any;
    transaction.razorpayPaymentId = razorpayPaymentId;
    transaction.razorpaySignature = razorpaySignature;
    await transaction.save();

    // 5. Clear cart
    await this.cartsService.clearCart(userId);

    // 6. Notify restaurants
    for (const order of createdOrders) {
      const restaurant = await this.restaurantModel.findById(order.restaurantId).populate('ownerId').exec();
      if (restaurant && restaurant.ownerId) {
        const owner = restaurant.ownerId as any;
        if (owner.firebaseUid) {
          await order.populate([
            { path: 'restaurantId', select: 'name logo address' },
            { path: 'userId', select: 'name phone email' }
          ]);
          this.socketsGateway.emitNewOrder(owner.firebaseUid, order.toJSON ? order.toJSON() : order);
        }
        await this.notificationsService.sendToUser(owner._id.toString(), {
          title: 'New Order Received! 🎉',
          body: `Online order (#${order._id.toString().slice(-6)}) for ₹${order.totalAmount / 100}`,
          data: { orderId: order._id.toString(), type: 'NEW_ORDER' }
        });
      }
    }

    return { orders: createdOrders };
  }

  async getUserOrders(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      this.orderModel.find({ userId: new Types.ObjectId(userId) })
        .populate('restaurantId', 'name logo coverImages rating address location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec()
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      totalItems,
      totalPages,
      currentPage: page
    };
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
    .populate('restaurantId', 'name logo address phone location')
    .populate('userId', 'name phone email')
    .sort({ createdAt: -1 })
    .exec();
  }

  async getVendorOrders(ownerId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    
    // 1. Find all restaurants owned by the vendor
    const restaurants = await this.restaurantModel.find({ ownerId: new Types.ObjectId(ownerId) }).select('_id').exec();
    const restaurantIds = restaurants.map((r: any) => r._id);

    if (restaurantIds.length === 0) {
      return { data: [], totalItems: 0, totalPages: 0, currentPage: page };
    }

    // 2. Find orders for these restaurants
    const baseMatch = { restaurantId: { $in: restaurantIds } };
    
    const [data, totalItems] = await Promise.all([
      this.orderModel.find(baseMatch)
        .populate('restaurantId', 'name logo address')
        .populate('userId', 'name phone email')
        .populate({
          path: 'driverId',
          populate: { path: 'userId', select: 'name phone' }
        })
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
      .populate('restaurantId', 'name logo coverImages rating address location')
      .populate('userId', 'name phone email')
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateOrderStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    if (updateOrderStatusDto.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Status "DELIVERED" cannot be set through this endpoint. Please use the dedicated delivery endpoint.');
    }

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status: updateOrderStatusDto.status },
      { returnDocument: 'after' }
    ).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const userIdStr = this.extractId(order.userId);


    await order.populate([
      { path: 'restaurantId', select: 'name logo address' },
      { path: 'userId', select: 'name phone email' },
      {
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone' }
      }
    ]);

    
    // 1. Emit to dynamic order room (for active detail screens)
    this.socketsGateway.emitOrderStatus(id, updateOrderStatusDto.status, order);

    // 2. Emit to vendor room (to sync list view across devices)
    const restaurant = await this.restaurantModel.findById(order.restaurantId).populate('ownerId').exec();
    if (restaurant && restaurant.ownerId) {
      const owner = restaurant.ownerId as any;
      if (owner.firebaseUid) {
        this.socketsGateway.emitOrderStatusToVendor(owner.firebaseUid, id, updateOrderStatusDto.status);
      }
    }

    // 3. Emit to driver room (to sync driver list view)
    if (order.driverId) {
      try {
        const driver = await this.driversService.findOne(order.driverId.toString());
        const driverUser = driver.userId as any;
        if (driverUser && driverUser.firebaseUid) {
          this.socketsGateway.emitOrderStatusToDriver(driverUser.firebaseUid, id, updateOrderStatusDto.status);
        }
      } catch (e) {
        // Silently fail if driver not found or user not populated
      }
    }


    // 3. Notify Customer about Status Change (Push Notification)
    await this.notificationsService.sendToUser(userIdStr, {

      title: 'Order Update 🍕',
      body: `Your order status is now: ${updateOrderStatusDto.status}`,
      data: { orderId: id, status: updateOrderStatusDto.status }
    });

    // Auto-assign driver if status is ACCEPTED
    if (updateOrderStatusDto.status === OrderStatus.ACCEPTED) {
      this.autoAssignDriver(id).catch(e => {
        console.error('Auto-assignment failed during status update:', e);
      });
    }
    
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
       
      },
      { new: true }
    ).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const userIdStr = this.extractId(order.userId);


    await order.populate([
      { path: 'restaurantId', select: 'name logo address' },
      { path: 'userId', select: 'name phone email' },
      {
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone' }
      }
    ]);


    // Notify Customer
    await this.notificationsService.sendToUser(userIdStr, {

      title: 'Driver Assigned! 🛵',
      body: 'A driver has been assigned to your order and is on the way.',
      data: { orderId: id, status: 'DRIVER_ASSIGNED' }
    });

    // Notify Driver (Corrected to use userId from populated driver)
    const driverUserId = this.extractId(driver.userId);


    await this.notificationsService.sendToUser(driverUserId, {
      title: 'New Delivery Assigned! 📦',
      body: `You have a new delivery at ${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
      data: { orderId: id, type: 'NEW_DELIVERY' }
    });
    
    // Live Socket sync
    this.socketsGateway.emitOrderStatus(id, order.status, order); // Inform everyone of the update
    
    const driverUser = driver.userId as any;

    if (driverUser && driverUser.firebaseUid) {
      this.socketsGateway.emitNewOrderToDriver(driverUser.firebaseUid, order);
    }

    return order;
  }

  async markDelivered(id: string, driverId?: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (driverId && (!order.driverId || order.driverId.toString() !== driverId)) {
      throw new BadRequestException('You are not authorized to mark this order as delivered. Is it assigned to you?');
    }

    if (order.status !== OrderStatus.OUT_FOR_DELIVERY && 
        order.status !== OrderStatus.PREPARING && 
        order.status !== OrderStatus.READY) {
      throw new BadRequestException(`Cannot deliver an order in ${order.status} status.`);
    }

    const deliveredAt = new Date();
    const durationMinutes = Math.round(
      (deliveredAt.getTime() - (order.createdAt as any).getTime()) / 60000
    );

    order.status = OrderStatus.DELIVERED;
    order.deliveredAt = deliveredAt;
    order.actualDeliveryTimeMinutes = durationMinutes;
    if (order.paymentMethod === 'COD') {
      order.paymentStatus = 'PAID';
    }
    await order.save();

    // Update restaurant's rolling delivery time average
    if (durationMinutes > 0 && durationMinutes < 180) { // Ignore outliers > 3 hours
      await this.restaurantModel.findByIdAndUpdate(
        order.restaurantId,
        {
          $inc: {
            totalDeliveryTimeMinutes: durationMinutes,
            deliveryCount: 1,
          },
        },
      ).exec();

      // Recompute and save the deliveryTime on the restaurant
      const restaurant = await this.restaurantModel.findById(order.restaurantId).exec();
      if (restaurant && restaurant.deliveryCount && restaurant.deliveryCount > 0) {
        const avgMinutes = Math.round(
          (restaurant.totalDeliveryTimeMinutes ?? 0) / restaurant.deliveryCount
        );
        await this.restaurantModel.findByIdAndUpdate(
          order.restaurantId,
          { deliveryTime: avgMinutes }
        ).exec();
      }
    }

    // Trigger phase 2 earning mechanisms securely!
    if (order.driverId || driverId) {
      await this.walletsService.processDeliveryEarnings(
        driverId || order.driverId!.toString(), 
        id, 
        order.deliveryFee || 0,
        order.totalAmount,
        order.paymentMethod
      );
    }

    // Trigger Admin/Platform commission and Restaurant Earnings
    await this.walletsService.processRestaurantEarnings(
      order.restaurantId.toString(),
      id,
      order.subTotal,
      order.tax || 0,
      order.cgst || 0,
      order.sgst || 0
    );

    // Notify Customer about Delivery
    await this.notificationsService.sendToUser(this.extractId(order.userId), {

      title: 'Order Delivered! 🍕',
      body: 'Your Rasikae treat has been delivered. Enjoy your meal!',
      data: { orderId: id, status: 'DELIVERED' }
    });

    // Update User Stats (Denormalization)
    await this.usersService.incrementUserStats(this.extractId(order.userId), order.totalAmount);


    // Live Socket Sync
    this.socketsGateway.emitOrderStatus(id, OrderStatus.DELIVERED, order);

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
    
    // if (!restaurant.location || !restaurant.location.coordinates || restaurant.location.coordinates.length < 2) {
    //   throw new BadRequestException('Restaurant does not have valid GPS coordinates defined.');
    // }

    // const [lng, lat] = restaurant.location.coordinates;
    // const nearbyDrivers = await this.driversService.findNearbyAvailable(lng, lat, maxDistance);

    const availableDrivers = await this.driversService.findAvailable();

    if (availableDrivers.length === 0) {
      return { order, message: 'No available drivers found.' };
    }

    // Pick the first available driver for testing
    const matchedDriver = availableDrivers[0] as any; 

    order.driverId = matchedDriver._id as any;
    order.status = OrderStatus.PREPARING;
    
    await order.save();
    
    const userIdStr = this.extractId(order.userId);


    // Populate for the response
    await order.populate([
      { path: 'restaurantId', select: 'name logo address' },
      { path: 'userId', select: 'name phone email' },
      { 
        path: 'driverId', 
        populate: { path: 'userId', select: 'name phone' } 
      }
    ]);


    const matchedDriverId = matchedDriver._id.toString();

    // Live Socket sync for Admin and others
    this.socketsGateway.emitOrderStatus(id, OrderStatus.PREPARING, order);



    // Notify Customer
    await this.notificationsService.sendToUser(userIdStr, {

      title: 'Driver Matched! 🛵',
      body: 'We found a driver for your order!',
      data: { orderId: id, status: 'DRIVER_ASSIGNED' }
    });

    // Notify Driver
    const driverUserId = this.extractId(matchedDriver.userId);

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

  async getAllOrders(page: number = 1, limit: number = 20, status?: string): Promise<any> {
    const skip = (page - 1) * limit;
    let query: any = {};
    
    if (status === 'active') {
      query = { 
        status: { 
          $nin: [
            OrderStatus.DELIVERED, 'delivered', 'Delivered',
            OrderStatus.CANCELLED, 'cancelled', 'Cancelled', 'cancel', 'Cancel'
          ] 
        } 
      };
    } else if (status) {
      query = { status };
    }

    
    const [data, totalItems] = await Promise.all([
      this.orderModel.find(query)
        .populate('restaurantId', 'name logo address')
        .populate('userId', 'name phone email')
        .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone' }
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query).exec()

    ]);

    const totalPages = Math.ceil(totalItems / limit);
  
    return {
      data,
      totalItems,
      totalPages,
      currentPage: page
    };
  }
}
