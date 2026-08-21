import { Injectable, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  Transaction,
  TransactionDocument,
} from '../wallets/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async generateOrdersCsv(startDate: Date, endDate: Date): Promise<string> {
    const cursor = this.orderModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('restaurantId', 'name')
      .populate('userId', 'name email')
      .cursor();

    const headers = [
      'Order ID',
      'Date',
      'Customer',
      'Restaurant',
      'Subtotal (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'Delivery Fee (₹)',
      'Packaging Fee (₹)',
      'Discount (₹)',
      'Total Amount (₹)',
      'Status',
      'Payment Method',
    ];

    const rows: any[][] = [];
    for await (const o of cursor) {
      const orderData = o as any;
      rows.push([
        o._id.toString(),
        o.createdAt ? o.createdAt.toISOString() : 'N/A',
        (o.userId as any)?.name || 'N/A',
        (o.restaurantId as any)?.name || 'N/A',
        (orderData.subTotal || 0) / 100,
        (orderData.cgst || 0) / 100,
        (orderData.sgst || 0) / 100,
        (orderData.deliveryFee || 0) / 100,
        (orderData.packagingFee || 0) / 100,
        (orderData.discountAmount || 0) / 100,
        (orderData.totalAmount || 0) / 100,
        o.status,
        o.paymentMethod,
      ]);
    }

    return this.toCsv(headers, rows);
  }

  async generateTransactionsCsv(
    startDate: Date,
    endDate: Date,
  ): Promise<string> {
    const cursor = this.transactionModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .cursor();

    const headers = ['TX ID', 'Date', 'Type', 'Amount (₹)', 'Description'];
    const rows: any[][] = [];

    for await (const t of cursor) {
      rows.push([
        t._id.toString(),
        t.createdAt ? t.createdAt.toISOString() : 'N/A',
        t.type,
        (t.amount || 0) / 100,
        t.description,
      ]);
    }

    return this.toCsv(headers, rows);
  }

  async generateUsersCsv(): Promise<string> {
    const cursor = this.userModel.find().cursor();

    const headers = [
      'User ID',
      'Name',
      'Email',
      'Phone',
      'Role',
      'Total Orders',
      'Total LTV (₹)',
    ];
    const rows: any[][] = [];

    for await (const u of cursor) {
      rows.push([
        u._id.toString(),
        u.name,
        u.email,
        u.phone || 'N/A',
        u.role || 'customer',
        u.totalOrders || 0,
        (u.ltv || 0) / 100,
      ]);
    }

    return this.toCsv(headers, rows);
  }

  private toCsv(headers: string[], rows: any[][]): string {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');
    return csvContent;
  }
}
