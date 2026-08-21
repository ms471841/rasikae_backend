import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './schemas/wallet.schema';
import { Transaction, TransactionType, TransactionStatus } from './schemas/transaction.schema';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { SettingsService } from '../settings/settings.service';
import { Types } from 'mongoose';

import { BankAccount } from '../restaurants/schemas/bank-account.schema';
import { PaymentsService } from '../payments/payments.service';
import { getConnectionToken } from '@nestjs/mongoose';

describe('WalletsService', () => {
  let service: WalletsService;
  let mockWalletModel: any;
  let mockTransactionModel: any;
  let mockRestaurantModel: any;
  let mockSettingsService: any;

  beforeEach(async () => {
    mockWalletModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
    };

    mockTransactionModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
    }));
    mockTransactionModel.find = jest.fn();
    mockTransactionModel.findOne = jest.fn();

    mockRestaurantModel = {
      findById: jest.fn(),
    };

    mockSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        platformCommissionPercentage: 0.1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken(Restaurant.name),
          useValue: mockRestaurantModel,
        },
        {
          provide: getModelToken(BankAccount.name),
          useValue: {},
        },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn() },
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: PaymentsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestWithdrawal', () => {
    const restaurantId = new Types.ObjectId().toString();
    const ownerId = new Types.ObjectId().toString();
    const withdrawDto = { amount: 5000, description: 'Payout request' };

    it('should successfully request withdrawal when balance is sufficient', async () => {
      const mockRestaurant = { _id: restaurantId, ownerId };
      mockRestaurantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRestaurant),
      });

      mockWalletModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          restaurantId: new Types.ObjectId(restaurantId),
          availableBalance: 10000,
        }),
      });

      const updatedWallet = {
        _id: new Types.ObjectId(),
        restaurantId: new Types.ObjectId(restaurantId),
        availableBalance: 5000,
      };

      mockWalletModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedWallet),
      });

      const result = await service.requestWithdrawal(
        restaurantId,
        withdrawDto,
        { _id: ownerId, role: 'vendor' },
      );

      expect(result).toBeDefined();
      expect(result.availableBalance).toBe(5000);
      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          availableBalance: { $gte: 5000 },
        }),
        expect.objectContaining({
          $inc: { availableBalance: -5000 },
        }),
        expect.anything(),
      );
    });

    it('should reject withdrawal when user is not authorized owner', async () => {
      const otherUserId = new Types.ObjectId().toString();
      const mockRestaurant = { _id: restaurantId, ownerId };
      mockRestaurantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRestaurant),
      });

      await expect(
        service.requestWithdrawal(
          restaurantId,
          withdrawDto,
          { _id: otherUserId, role: 'vendor' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject withdrawal when available balance is insufficient', async () => {
      const mockRestaurant = { _id: restaurantId, ownerId };
      mockRestaurantModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRestaurant),
      });

      mockWalletModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          restaurantId: new Types.ObjectId(restaurantId),
          availableBalance: 2000,
        }),
      });

      // Atomic findOneAndUpdate returns null because availableBalance >= 5000 fails
      mockWalletModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.requestWithdrawal(
          restaurantId,
          withdrawDto,
          { _id: ownerId, role: 'vendor' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
