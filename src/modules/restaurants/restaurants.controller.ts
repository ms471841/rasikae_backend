import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
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
    @Body() createRestaurantDto: CreateRestaurantDto,
  ) {
    const uid = user.uid || user.firebaseUid;
    const mongoUser = await this.usersService.getProfile(uid);
    // Passing the MongoDB User _id as the ownerId
    return this.restaurantsService.create(mongoUser._id.toString(), createRestaurantDto);
  }

  @Get()
  async findAll() {
    return this.restaurantsService.findAll();
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

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }
}
