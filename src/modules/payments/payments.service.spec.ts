import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentTransaction } from './schemas/transaction.schema';
import { Order } from '../orders/schemas/order.schema';
import { Wallet } from '../wallets/schemas/wallet.schema';
import { Transaction as WalletTransaction } from '../wallets/schemas/transaction.schema';
import * as crypto from 'crypto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockConfigService: any;
  let mockTransactionModel: any;

  const mockSecret = 'test_razorpay_secret_key_12345';

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RAZORPAY_KEY_SECRET') return mockSecret;
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return mockSecret;
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_123';
        return null;
      }),
    };

    mockTransactionModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: 'RAZORPAY_INSTANCE', useValue: { contacts: { create: jest.fn() }, fundAccounts: { create: jest.fn() }, payouts: { create: jest.fn() } } },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(PaymentTransaction.name), useValue: mockTransactionModel },
        { provide: getModelToken(Order.name), useValue: {} },
        { provide: getModelToken(Wallet.name), useValue: {} },
        { provide: getModelToken(WalletTransaction.name), useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyPaymentSignature', () => {
    const orderId = 'order_testid_123';
    const paymentId = 'pay_testid_456';

    it('should return true for a cryptographically valid Razorpay signature', async () => {
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(payload)
        .digest('hex');

      const isValid = await service.verifyPaymentSignature(orderId, paymentId, validSignature);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid or tampered signature', async () => {
      const invalidSignature = 'invalid_tampered_signature_hex_value';
      const isValid = await service.verifyPaymentSignature(orderId, paymentId, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should throw BadRequestException if secret is missing', async () => {
      mockConfigService.get.mockReturnValue(null);
      await expect(
        service.verifyPaymentSignature(orderId, paymentId, 'sig'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    it('should verify valid rawBuffer HMAC signature', async () => {
      const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } };
      const rawPayload = Buffer.from(JSON.stringify(body), 'utf8');
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(rawPayload)
        .digest('hex');

      mockTransactionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.handleWebhook(rawPayload, body, validSignature),
      ).resolves.not.toThrow();
    });

    it('should reject invalid webhook signature', async () => {
      const body = { event: 'payment.captured' };
      const rawPayload = Buffer.from(JSON.stringify(body), 'utf8');

      await expect(
        service.handleWebhook(rawPayload, body, 'invalid_signature'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
