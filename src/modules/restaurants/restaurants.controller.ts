import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';
import { UsersService } from '../users/users.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(
    @CurrUser() user: any,
    @Body() createRestaurantDto: CreateRestaurantDto & { ownerId?: string },
  ) {
    const uid = user.uid || user.firebaseUid;
    const mongoUser = await this.usersService.getProfile(uid);
    
    // Default to the current user as owner
    let targetOwnerId = mongoUser._id.toString();
    
    // If admin provides an ownerId, override it
    if (mongoUser.role === 'admin' && createRestaurantDto.ownerId) {
      targetOwnerId = createRestaurantDto.ownerId;
    }
    
    return this.restaurantsService.create(targetOwnerId, createRestaurantDto);
  }

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
    };
    
    return this.restaurantsService.getHomeFeed(parsedLat, parsedLng, parsedLimit, filters);
  }

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
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      search: search,
    };

    return this.restaurantsService.findAll(parsedPage, parsedLimit, parsedLat, parsedLng, filters);
  }

  @Get('my-restaurants')
  @UseGuards(FirebaseAuthGuard)
  async findMyRestaurants(@CurrUser() user: any) {
    const uid = user.uid || user.firebaseUid;
    const mongoUser = await this.usersService.getProfile(uid);
    return this.restaurantsService.findByOwner(mongoUser._id.toString());
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto);
  }

  @Get(':id/bank-account')
  @UseGuards(FirebaseAuthGuard)
  async getBankAccount(@Param('id') id: string) {
    return this.restaurantsService.getBankAccount(id);
  }

  @Post(':id/bank-account')
  @UseGuards(FirebaseAuthGuard)
  async upsertBankAccount(
    @Param('id') id: string,
    @Body() bankAccountData: any,
  ) {
    return this.restaurantsService.upsertBankAccount(id, bankAccountData);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }
}
