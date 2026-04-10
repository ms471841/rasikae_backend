import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Promotion, PromotionDocument, DiscountType } from './schemas/promotion.schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    const existing = await this.promotionModel.findOne({ code: createPromotionDto.code.toUpperCase() }).exec();
    if (existing) {
      throw new BadRequestException('Promotion code already exists');
    }
    const createdPromotion = new this.promotionModel(createPromotionDto);
    return createdPromotion.save();
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionModel.find().exec();
  }

  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.promotionModel.findById(id).exec();
    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.promotionModel.findByIdAndUpdate(
      id,
      updatePromotionDto,
      { new: true }
    ).exec();

    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return promotion;
  }

  async validateCoupon(validateDto: ValidatePromotionDto): Promise<{ valid: boolean, discountAmount: number, finalTotal: number, message: string }> {
    const { code, cartTotal, restaurantId, userId } = validateDto;
    
    const promotion = await this.promotionModel.findOne({ code: code.toUpperCase() }).exec();
    
    if (!promotion) {
      throw new NotFoundException('Invalid promotion code');
    }

    if (!promotion.isActive) {
      throw new BadRequestException('This promotion is no longer active');
    }

    const now = new Date();
    if (promotion.startDate && new Date(promotion.startDate) > now) {
      throw new BadRequestException('This promotion has not started yet');
    }

    if (promotion.endDate && new Date(promotion.endDate) < now) {
      throw new BadRequestException('This promotion has expired');
    }

    if (promotion.minOrderValue > 0 && cartTotal < promotion.minOrderValue) {
      throw new BadRequestException(`Minimum order value of ${promotion.minOrderValue} required for this promotion`);
    }

    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      throw new BadRequestException('This promotion has reached its usage limit');
    }

    if (promotion.restaurantId && promotion.restaurantId.toString() !== restaurantId) {
      throw new BadRequestException('This promotion inside invalid for the current restaurant');
    }

    // Check if user already used it
    const hasUsed = promotion.usedBy.some(id => id.toString() === userId);
    if (hasUsed) {
      throw new BadRequestException('You have already used this promotion code');
    }

    // Calculate discount
    let discountAmount = 0;
    if (promotion.discountType === DiscountType.PERCENTAGE) {
      discountAmount = cartTotal * (promotion.discountValue / 100);
      if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
        discountAmount = promotion.maxDiscount;
      }
    } else if (promotion.discountType === DiscountType.FLAT) {
      discountAmount = promotion.discountValue;
    }

    // Don't negative balance the cart
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    const finalTotal = cartTotal - discountAmount;

    return {
      valid: true,
      discountAmount,
      finalTotal,
      message: 'Promotion applied successfully',
    };
  }

  async recordPromotionUsage(code: string, userId: string): Promise<void> {
    const promotion = await this.promotionModel.findOne({ code: code.toUpperCase() }).exec();
    if (promotion) {
      promotion.usedCount += 1;
      if (!promotion.usedBy.some(id => id.toString() === userId)) {
         promotion.usedBy.push(new Types.ObjectId(userId));
      }
      await promotion.save();
    }
  }

  async remove(id: string): Promise<Promotion> {
    const promotion = await this.promotionModel.findByIdAndDelete(id).exec();
    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return promotion;
  }
}
