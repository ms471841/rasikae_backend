import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { TargetType } from './schemas/review.schema';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';

@Controller('reviews')
@UseGuards(FirebaseAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createReviewDto: CreateReviewDto, @Req() req: any) {
    createReviewDto.userId = req.user._id;
    return this.reviewsService.create(createReviewDto);
  }

  @Get('target/:targetId')
  findByTarget(@Param('targetId') targetId: string, @Query('targetType') targetType: TargetType) {
    return this.reviewsService.findByTarget(targetId, targetType);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }
}
