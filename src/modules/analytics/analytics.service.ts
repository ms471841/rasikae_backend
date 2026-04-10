import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>
  ) {}

  async getRestaurantDashboardStats(restaurantId: string) {
    const objectId = new Types.ObjectId(restaurantId);

    const [revenueStats, orderCounts, topItems] = await Promise.all([
      // 1. Calculate Revenue
      this.orderModel.aggregate([
        { $match: { restaurantId: objectId, status: 'DELIVERED' } },
        { 
          $group: { 
            _id: null, 
            lifetimeSubTotal: { $sum: '$subTotal' },
            lifetimeTotalAmount: { $sum: '$totalAmount' } 
          } 
        }
      ]),

      // 2. Calculate Orders by Status
      this.orderModel.aggregate([
        { $match: { restaurantId: objectId } },
        { 
          $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          } 
        }
      ]),

      // 3. Top Performing Items
      this.orderModel.aggregate([
        { $match: { restaurantId: objectId } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            totalSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ])
    ]);

    const revenue = revenueStats.length > 0 ? revenueStats[0].lifetimeSubTotal : 0;
    
    // Calculate commission dynamically based off historical static logic (assuming 10% was pulled from subTotal)
    const expectedCommission = revenue * 0.10;
    const finalEarnings = revenue - expectedCommission;

    const formattedOrderCounts = orderCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      revenue: {
        grossSubTotal: revenue,
        estimatedPlatformCommission: expectedCommission,
        netEarnings: finalEarnings
      },
      orderStats: formattedOrderCounts,
      topItems: topItems.map(item => ({ name: item._id, quantitySold: item.totalSold }))
    };
  }
}
