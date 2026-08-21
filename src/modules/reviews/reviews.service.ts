import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument, TargetType } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    const { orderId, targetId, targetType, rating } = createReviewDto;

    // 0. Validate ObjectIds
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid Order ID format');
    }
    if (!Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Invalid Target ID format');
    }

    // 1. Validate the order exists, is DELIVERED, and belongs to this user
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order not found`);
    }

    if (
      !createReviewDto.userId ||
      order.userId.toString() !== createReviewDto.userId.toString()
    ) {
      throw new BadRequestException(
        'You cannot review an order placed by another user',
      );
    }

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('You can only review delivered orders');
    }

    if (order.isReviewed && targetType === TargetType.RESTAURANT) {
      throw new BadRequestException('This order has already been reviewed.');
    }

    // 2. Prevent duplicate reviews for the same target and order
    const existingReview = await this.reviewModel
      .findOne({
        orderId: new Types.ObjectId(orderId),
        targetId: new Types.ObjectId(targetId),
        targetType,
      })
      .exec();

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this item for this order.',
      );
    }

    // 3. Save the review
    const newReview = new this.reviewModel(createReviewDto);
    await newReview.save();

    // 4. Mark order as reviewed if the target is a restaurant
    if (targetType === TargetType.RESTAURANT) {
      order.isReviewed = true;
      await order.save();
    }

    // 5. Update the Target Entity's Aggregate Rating concurrently
    let targetModel: Model<any>;
    if (targetType === TargetType.RESTAURANT) {
      targetModel = this.restaurantModel;
    } else if (targetType === TargetType.DRIVER) {
      targetModel = this.driverModel;
    } else if (targetType === TargetType.MENU_ITEM) {
      targetModel = this.menuItemModel;
    } else {
      throw new BadRequestException(`Invalid targetType: ${targetType}`);
    }

    const entity = await targetModel.findById(targetId).session(null).exec();

    if (entity) {
      // Safely perform average math
      const currentRatingCount = entity.ratingCount || 0;
      const currentRating = entity.rating || 0;

      const newRatingCount = currentRatingCount + 1;
      const newRating =
        (currentRating * currentRatingCount + rating) / newRatingCount;

      entity.rating = Number(newRating.toFixed(2));
      entity.ratingCount = newRatingCount;

      // specifically for restaurants that also have ratingSum
      if (typeof entity.ratingSum !== 'undefined') {
        entity.ratingSum = (entity.ratingSum || 0) + rating;
      }

      await entity.save();
    }

    return newReview;
  }

  async findByTarget(targetId: string, targetType: string): Promise<Review[]> {
    return this.reviewModel
      .find({
        targetId: new Types.ObjectId(targetId),
        targetType,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<Review[]> {
    return this.reviewModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}
