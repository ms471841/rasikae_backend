import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { TargetType } from './schemas/review.schema';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';

/**
 * ============================================================================
 * REVIEWS & RATINGS CONTROLLER
 * Handles Ratings for Restaurants, Delivery Drivers & Dishes
 * ============================================================================
 */
@Controller('reviews')
@UseGuards(FirebaseAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Submit a new rating and review after order delivery
   * POST /reviews
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createReviewDto: CreateReviewDto, @Req() req: any) {
    createReviewDto.userId = req.user._id;
    return this.reviewsService.create(createReviewDto);
  }

  /**
   * [📱 USER APP / 🍳 VENDOR / 🛵 DRIVER] Get reviews for a specific target (restaurant or driver)
   * GET /reviews/target/:targetId?targetType=RESTAURANT
   */
  @Get('target/:targetId')
  findByTarget(
    @Param('targetId') targetId: string,
    @Query('targetType') targetType: TargetType,
  ) {
    return this.reviewsService.findByTarget(targetId, targetType);
  }

  /**
   * [📱 USER APP / 👑 ADMIN] Get reviews submitted by a specific user
   * GET /reviews/user/:userId
   */
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }
}
