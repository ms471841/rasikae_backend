import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { ReportsService } from './reports.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('orders')
  async exportOrders(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: express.Response,
  ) {
    const startDate = new Date(start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const endDate = new Date(end || new Date().toISOString());
    
    const csv = await this.reportsService.generateOrdersCsv(startDate, endDate);
    
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=orders_report_${Date.now()}.csv`);
    res.status(200).send(csv);
  }

  @Get('transactions')
  async exportTransactions(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: express.Response,
  ) {
    const startDate = new Date(start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const endDate = new Date(end || new Date().toISOString());
    
    const csv = await this.reportsService.generateTransactionsCsv(startDate, endDate);
    
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=transactions_report_${Date.now()}.csv`);
    res.status(200).send(csv);
  }

  @Get('users')
  async exportUsers(@Res() res: express.Response) {
    const csv = await this.reportsService.generateUsersCsv();
    
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=users_report_${Date.now()}.csv`);
    res.status(200).send(csv);
  }
}
