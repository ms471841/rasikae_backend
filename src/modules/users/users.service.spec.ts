import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Address } from '../addresses/schemas/address.schema';
import { Cart } from '../carts/schemas/cart.schema';
import { Order } from '../orders/schemas/order.schema';
import { Vendor } from '../vendors/schemas/vendor.schema';
import { FIREBASE_APP } from '../firebase/firebase.module';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const mockModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockModel },
        { provide: getModelToken(Address.name), useValue: mockModel },
        { provide: getModelToken(Cart.name), useValue: mockModel },
        { provide: getModelToken(Order.name), useValue: mockModel },
        { provide: getModelToken(Vendor.name), useValue: mockModel },
        { provide: FIREBASE_APP, useValue: { auth: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
