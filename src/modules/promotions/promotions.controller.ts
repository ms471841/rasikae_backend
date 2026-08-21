import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * ============================================================================
 * PROMOTIONS & COUPONS CONTROLLER
 * Handles Discount Coupons, Cart Promo Validation & Admin Marketing Campaigns
 * ============================================================================
 */
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Validate coupon code for active cart checkout
   * POST /promotions/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateCoupon(@Body() validatePromotionDto: ValidatePromotionDto) {
    return this.promotionsService.validateCoupon(validatePromotionDto);
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Create a new promo campaign / coupon
   * POST /promotions
   */
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  /**
   * [👑 ADMIN PANEL] List all promotion campaigns
   * GET /promotions
   */
  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.promotionsService.findAll();
  }

  /**
   * [👑 ADMIN PANEL] Get promotion campaign details by ID
   * GET /promotions/:id
   */
  @Get(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  /**
   * [👑 ADMIN PANEL] Update promo campaign
   * PATCH /promotions/:id
   */
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  /**
   * [👑 ADMIN PANEL] Delete promo campaign
   * DELETE /promotions/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
