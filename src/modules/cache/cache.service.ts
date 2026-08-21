import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryCacheEntry {
  value: string;
  expiry: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initRedis();
  }

  private initRedis() {
    const redisUri = this.configService.get<string>('REDIS_URI') || this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = Number(this.configService.get<number>('REDIS_PORT')) || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    if (redisUri || redisHost) {
      try {
        if (redisUri) {
          this.redisClient = new Redis(redisUri, {
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Don't hang indefinitely on startup
            enableReadyCheck: true,
            lazyConnect: true,
          });
        } else {
          this.redisClient = new Redis({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
            enableReadyCheck: true,
            lazyConnect: true,
          });
        }

        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          this.logger.log('Connected to Redis server successfully.');
        });

        this.redisClient.on('error', (err) => {
          this.isRedisConnected = false;
          this.logger.warn(`Redis connection unavailable: ${err.message}. Operating in In-Memory fallback mode.`);
        });

        this.redisClient.connect().catch((err) => {
          this.isRedisConnected = false;
          this.logger.warn(`Could not connect to Redis: ${err.message}. Using In-Memory fallback cache.`);
        });
      } catch (error) {
        this.isRedisConnected = false;
        this.logger.warn(`Redis init error: ${error.message}. Defaulting to In-Memory cache.`);
      }
    } else {
      this.logger.log('No REDIS_HOST or REDIS_URI provided in .env. Operating in In-Memory Cache mode.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (err) {
        this.logger.warn(`Redis get error for key "${key}": ${err.message}`);
      }
    }

    // In-Memory Fallback
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (entry.expiry > 0 && Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isRedisConnected && this.redisClient) {
      try {
        if (ttlSeconds > 0) {
          await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, serialized);
        }
        return;
      } catch (err) {
        this.logger.warn(`Redis set error for key "${key}": ${err.message}`);
      }
    }

    // In-Memory Fallback
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.memoryCache.set(key, { value: serialized, expiry });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err) {
        this.logger.warn(`Redis del error for key "${key}": ${err.message}`);
      }
    }

    this.memoryCache.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
        return;
      } catch (err) {
        this.logger.warn(`Redis delByPattern error for pattern "${pattern}": ${err.message}`);
      }
    }

    // In-Memory Fallback pattern matching (e.g. "restaurants:*")
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  getDriverInfo(): { driver: 'redis' | 'in-memory'; connected: boolean } {
    return {
      driver: this.isRedisConnected ? 'redis' : 'in-memory',
      connected: this.isRedisConnected || this.memoryCache !== null,
    };
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // Ignored
      }
    }
    this.memoryCache.clear();
  }
}
