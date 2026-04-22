import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  async getGlobalStats() {
    const [revenueStats, orderCounts, userCounts, restaurantCount, driverCount] = await Promise.all([
      // 1. Total Revenue
      this.orderModel.aggregate([
        { $match: { status: 'DELIVERED' } },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: '$subTotal' } 
          } 
        }
      ]),

      // 2. Orders by Status
      this.orderModel.aggregate([
        { 
          $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          } 
        }
      ]),

      // 3. User counts
      this.userModel.countDocuments().exec(),
      this.restaurantModel.countDocuments().exec(),
      this.driverModel.countDocuments().exec()
    ]);

    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;
    const formattedOrderCounts = orderCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      overview: {
        totalRevenue,
        totalUsers: userCounts,
        totalRestaurants: restaurantCount,
        totalDrivers: driverCount
      },
      orderStats: formattedOrderCounts
    };
  }

  async getWeeklyTrends() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trends = await this.orderModel.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sevenDaysAgo },
          status: 'DELIVERED'
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$subTotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill gaps with zeros for a smooth chart
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateString = date.toISOString().split('T')[0];
      const match = trends.find(t => t._id === dateString);
      
      result.push({
        date: dateString,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: match ? match.revenue : 0,
        orders: match ? match.orders : 0
      });
    }

    return result;
  }

  async getRestaurantDashboardStats(restaurantId: string) {
    if (!Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Invalid restaurant identifier format');
    }
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
