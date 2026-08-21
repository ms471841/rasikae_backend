import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';
import { UsersService } from '../users/users.service';

/**
 * ============================================================================
 * RESTAURANTS CONTROLLER
 * Handles Home Feed, Restaurant Listings, Vendor Restaurant Management & Bank Accounts
 * ============================================================================
 */
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
  ) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Get curated home screen feed with location & filter support
   * GET /restaurants/home-feed?lat=...&lng=...&limit=10
   */
  @Get('home-feed')
  async getHomeFeed(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
    @Query('minRating') minRating?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('isVeg') isVeg?: string,
    @Query('cuisines') cuisines?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('nearAndFast') nearAndFast?: string,
    @Query('hasOffers') hasOffers?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    const filters = {
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      isVeg: isVeg === 'true' ? true : isVeg === 'false' ? false : undefined,
      cuisines: cuisines ? cuisines.split(',') : undefined,
      categoryId: categoryId,
      sortBy: sortBy,
      nearAndFast: nearAndFast === 'true',
      hasOffers: hasOffers === 'true',
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    };

    return this.restaurantsService.getHomeFeed(
      parsedLat,
      parsedLng,
      parsedLimit,
      filters,
    );
  }

  /**
   * [📱 USER APP / 👑 ADMIN / 🍳 VENDOR] Get paginated restaurant list with filters
   * GET /restaurants?page=1&limit=10&search=pizza
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('minRating') minRating?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('isVeg') isVeg?: string,
    @Query('cuisines') cuisines?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('isPublished') isPublished?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('nearAndFast') nearAndFast?: string,
    @Query('hasOffers') hasOffers?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;

    const filters = {
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      isVeg: isVeg === 'true' ? true : isVeg === 'false' ? false : undefined,
      cuisines: cuisines ? cuisines.split(',') : undefined,
      categoryId: categoryId,
      status: status,
      isPublished:
        isPublished === 'true'
          ? true
          : isPublished === 'false'
            ? false
            : undefined,
      search: search,
      sortBy: sortBy,
      nearAndFast: nearAndFast === 'true',
      hasOffers: hasOffers === 'true',
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    };

    return this.restaurantsService.findAll(
      parsedPage,
      parsedLimit,
      parsedLat,
      parsedLng,
      filters,
    );
  }

  /**
   * [📱 USER APP / 🍳 VENDOR / 👑 ADMIN] Get single restaurant detail by ID
   * GET /restaurants/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  // --------------------------------------------------------------------------
  // 🍳 VENDOR APP & 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Create a new restaurant
   * POST /restaurants
   */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(
    @CurrUser() user: any,
    @Body() createRestaurantDto: CreateRestaurantDto & { ownerId?: string },
  ) {
    const uid = user.uid || user.firebaseUid;
    const mongoUser = await this.usersService.getProfile(uid);

    let targetOwnerId = mongoUser._id.toString();

    if (mongoUser.role === 'admin' && createRestaurantDto.ownerId) {
      targetOwnerId = createRestaurantDto.ownerId;
    }

    return this.restaurantsService.create(targetOwnerId, createRestaurantDto);
  }

  /**
   * [🍳 VENDOR APP] Get restaurants owned by logged-in vendor user
   * GET /restaurants/my-restaurants
   */
  @Get('my-restaurants')
  @UseGuards(FirebaseAuthGuard)
  async findMyRestaurants(@CurrUser() user: any) {
    const uid = user.uid || user.firebaseUid;
    const mongoUser = await this.usersService.getProfile(uid);
    return this.restaurantsService.findByOwner(mongoUser._id.toString());
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Update restaurant profile, status, or timing
   * PATCH /restaurants/:id
   */
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto, user);
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Get bank account details for payouts
   * GET /restaurants/:id/bank-account
   */
  @Get(':id/bank-account')
  @UseGuards(FirebaseAuthGuard)
  async getBankAccount(@CurrUser() user: any, @Param('id') id: string) {
    return this.restaurantsService.getBankAccount(id, user);
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Save/update bank account details for payouts
   * POST /restaurants/:id/bank-account
   */
  @Post(':id/bank-account')
  @UseGuards(FirebaseAuthGuard)
  async upsertBankAccount(
    @CurrUser() user: any,
    @Param('id') id: string,
    @Body() bankAccountData: any,
  ) {
    return this.restaurantsService.upsertBankAccount(id, bankAccountData, user);
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Delete a restaurant
   * DELETE /restaurants/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async remove(@CurrUser() user: any, @Param('id') id: string) {
    return this.restaurantsService.remove(id, user);
  }
}
