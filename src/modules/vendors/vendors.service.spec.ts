import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VendorsService } from './vendors.service';
import { Vendor } from './schemas/vendor.schema';
import { User } from '../users/schemas/user.schema';
import { FIREBASE_APP } from '../firebase/firebase.module';

describe('VendorsService', () => {
  let service: VendorsService;

  beforeEach(async () => {
    const mockModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: getModelToken(Vendor.name), useValue: mockModel },
        { provide: getModelToken(User.name), useValue: mockModel },
        { provide: FIREBASE_APP, useValue: { auth: jest.fn() } },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
