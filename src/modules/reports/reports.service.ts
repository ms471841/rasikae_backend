import { Injectable, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Transaction, TransactionDocument } from '../wallets/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async generateOrdersCsv(startDate: Date, endDate: Date): Promise<string> {
    const orders = await this.orderModel.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('restaurantId', 'name').populate('userId', 'name email').exec();

    const headers = ['Order ID', 'Date', 'Customer', 'Restaurant', 'Amount', 'Status', 'Payment Method'];
    const rows = orders.map(o => [
      o._id.toString(),
      o.createdAt.toISOString(),
      (o.userId as any)?.name || 'N/A',
      (o.restaurantId as any)?.name || 'N/A',
      o.totalAmount / 100,
      o.status,
      o.paymentMethod
    ]);

    return this.toCsv(headers, rows);
  }

  async generateTransactionsCsv(startDate: Date, endDate: Date): Promise<string> {
    const txs = await this.transactionModel.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec();

    const headers = ['TX ID', 'Date', 'Type', 'Amount', 'Description'];
    const rows = txs.map(t => [
      t._id.toString(),
      t.createdAt.toISOString(),
      t.type,
      t.amount / 100,
      t.description
    ]);

    return this.toCsv(headers, rows);
  }

  async generateUsersCsv(): Promise<string> {
    const users = await this.userModel.find().exec();

    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Orders Count', 'Total LTV'];
    const rows = users.map(u => [
      u._id.toString(),
      u.name,
      u.email,
      u.phone || 'N/A',
      (u as any).ordersCount || 0,
      ((u as any).totalSpent || 0) / 100
    ]);

    return this.toCsv(headers, rows);
  }

  private toCsv(headers: string[], rows: any[][]): string {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    return csvContent;
  }
}
