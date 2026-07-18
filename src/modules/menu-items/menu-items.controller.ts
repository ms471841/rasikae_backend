import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrUser } from '../auth/decorators/user.decorator';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrUser() user: any, @Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemsService.create(createMenuItemDto, user);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('isVeg') isVeg?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const filters = {
      search,
      restaurantId,
      isVeg: isVeg === 'true' ? true : isVeg === 'false' ? false : undefined,
      isAvailable: isAvailable === 'true' ? true : isAvailable === 'false' ? false : undefined,
    };
    return this.menuItemsService.findAll(parsedPage, parsedLimit, filters);
  }

  @Get('restaurant/:id')
  findByRestaurant(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isVeg') isVeg?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const filters = {
      isVeg: isVeg === 'true' ? true : isVeg === 'false' ? false : undefined,
      isAvailable: isAvailable === 'true' ? true : isAvailable === 'false' ? false : undefined,
    };
    return this.menuItemsService.findByRestaurant(id, parsedPage, parsedLimit, filters);
  }

  @Get('restaurant/:id/grouped')
  findByRestaurantGrouped(@Param('id') id: string) {
    return this.menuItemsService.getGroupedMenuByRestaurant(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  update(@CurrUser() user: any, @Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemsService.update(id, updateMenuItemDto, user);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrUser() user: any, @Param('id') id: string) {
    return this.menuItemsService.remove(id, user);
  }
}
