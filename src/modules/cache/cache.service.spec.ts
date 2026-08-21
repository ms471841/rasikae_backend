import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockConfigService: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(null), // No Redis config -> test in-memory fallback
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get values with TTL in in-memory fallback mode', async () => {
    await service.set('test:key', { message: 'hello' }, 10);
    const cached = await service.get<{ message: string }>('test:key');
    expect(cached).toEqual({ message: 'hello' });
  });

  it('should return null for non-existent or deleted key', async () => {
    await service.set('test:temp', 123, 10);
    await service.del('test:temp');
    const result = await service.get('test:temp');
    expect(result).toBeNull();
  });

  it('should delete keys matching wildcard pattern', async () => {
    await service.set('restaurants:1', 'r1', 10);
    await service.set('restaurants:2', 'r2', 10);
    await service.set('users:1', 'u1', 10);

    await service.delByPattern('restaurants:*');

    expect(await service.get('restaurants:1')).toBeNull();
    expect(await service.get('restaurants:2')).toBeNull();
    expect(await service.get('users:1')).toBe('u1');
  });
});
