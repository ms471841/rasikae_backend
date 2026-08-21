import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { MenuItem } from '../menu-items/schemas/menu-item.schema';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { PaymentTransaction } from '../payments/schemas/transaction.schema';
import { CartsService } from '../carts/carts.service';
import { DriversService } from '../drivers/drivers.service';
import { WalletsService } from '../wallets/wallets.service';
import { SocketsGateway } from '../sockets/sockets.gateway';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { PromotionsService } from '../promotions/promotions.service';
import { Types } from 'mongoose';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockOrderModel: any;
  let mockMenuItemModel: any;
  let mockRestaurantModel: any;
  let mockCartsService: any;
  let mockSettingsService: any;
  let mockPromotionsService: any;

  beforeEach(async () => {
    mockOrderModel = jest.fn().mockImplementation((data) => {
      const orderObj = {
        _id: new Types.ObjectId(),
        ...data,
        populate: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue(data),
      };
      orderObj.save = jest.fn().mockResolvedValue(orderObj);
      return orderObj;
    });
    mockOrderModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    mockOrderModel.findById = jest.fn();

    mockMenuItemModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          name: 'Butter Chicken',
          discountPrice: 35000,
          packagingChargeInPaise: 2000,
        }),
      }),
    };

    mockRestaurantModel = {
      findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ownerId: {
              _id: new Types.ObjectId(),
              firebaseUid: 'uid_123',
            },
          }),
        }),
        exec: jest.fn().mockResolvedValue({
          location: { coordinates: [77.209, 28.613] },
        }),
      }),
    };

    mockCartsService = {
      getCart: jest.fn(),
      clearCart: jest.fn().mockResolvedValue(true),
    };

    mockSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        isMaintenanceMode: false,
        minOrderValue: 10000, // ₹100
        taxPercentage: 0.05, // 5% GST
        deliveryBaseFee: 4000, // ₹40
      }),
    };

    mockPromotionsService = {
      validateCoupon: jest.fn(),
      recordPromotionUsage: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(MenuItem.name), useValue: mockMenuItemModel },
        { provide: getModelToken(Restaurant.name), useValue: mockRestaurantModel },
        { provide: getModelToken(PaymentTransaction.name), useValue: {} },
        { provide: getConnectionToken(), useValue: { startSession: jest.fn() } },
        { provide: CartsService, useValue: mockCartsService },
        { provide: DriversService, useValue: { findNearbyAvailable: jest.fn(), findAvailable: jest.fn() } },
        { provide: WalletsService, useValue: {} },
        { provide: SocketsGateway, useValue: { emitNewOrder: jest.fn(), emitOrderStatus: jest.fn() } },
        { provide: PaymentsService, useValue: {} },
        { provide: NotificationsService, useValue: { sendToUser: jest.fn() } },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: UsersService, useValue: { getProfile: jest.fn() } },
        { provide: PromotionsService, useValue: mockPromotionsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout calculation', () => {
    it('should accurately calculate subTotal, split 5% GST into CGST/SGST, apply packaging, and deduct coupon discount', async () => {
      const userId = new Types.ObjectId().toString();
      const restaurantId = new Types.ObjectId().toString();

      mockCartsService.getCart.mockResolvedValue({
        items: [
          {
            restaurantId,
            menuItemId: new Types.ObjectId().toString(),
            quantity: 2,
            price: 30000, // ₹300 per item in Paise
            totalItemPrice: 60000, // ₹600 subtotal in Paise
          },
        ],
      });

      mockPromotionsService.validateCoupon.mockResolvedValue({
        valid: true,
        discountAmount: 5000, // ₹50 coupon discount
      });

      const checkoutDto = {
        deliveryAddress: {
          street: '123 Test St',
          city: 'Delhi',
        },
        paymentMethod: 'COD',
        idempotencyKey: 'key_abc_123',
        couponCode: 'WELCOME50',
      };

      const result = await service.checkout(userId, checkoutDto);

      expect(result.orders).toBeDefined();
      expect(result.orders.length).toBe(1);

      expect(mockOrderModel).toHaveBeenCalledWith(
        expect.objectContaining({
          subTotal: 60000, // ₹600
          tax: 3000, // 5% of ₹600 = ₹30 (3000 Paise)
          cgst: 1500, // 2.5% = ₹15 (1500 Paise)
          sgst: 1500, // 2.5% = ₹15 (1500 Paise)
          deliveryFee: 4000, // ₹40
          packagingFee: 4000, // 2 items * 2000 Paise = 4000 Paise (₹40)
          couponCode: 'WELCOME50',
          // totalAmount = 60000 (subtotal) + 3000 (tax) + 4000 (delivery) + 4000 (packaging) - 5000 (coupon) = 66000 Paise (₹660)
          totalAmount: 66000,
        }),
      );

      expect(mockPromotionsService.recordPromotionUsage).toHaveBeenCalledWith('WELCOME50', userId);
    });
  });
});
