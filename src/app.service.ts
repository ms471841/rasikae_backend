import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CacheService } from './modules/cache/cache.service';

@Injectable()
export class AppService {
  constructor(
    @Optional() @InjectConnection() private readonly connection?: Connection,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  getHello(): string {
    return 'Rasikae Backend is running';
  }

  getHealth() {
    const isMongoConnected = this.connection?.readyState === 1;
    const memory = process.memoryUsage();
    const cacheInfo = this.cacheService?.getDriverInfo?.() || {
      driver: 'in-memory',
      connected: true,
    };

    return {
      status: isMongoConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: isMongoConnected ? 'connected' : 'disconnected',
        readyState: this.connection?.readyState ?? 0,
      },
      cache: cacheInfo,
      memory: {
        heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
