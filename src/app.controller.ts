import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('System & Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Backend root status' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'System Health Check & Resource Telemetry' })
  @ApiResponse({
    status: 200,
    description: 'System health status, database connection, cache driver, and memory usage',
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
