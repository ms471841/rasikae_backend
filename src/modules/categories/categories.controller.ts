import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * ============================================================================
 * FOOD CATEGORIES CONTROLLER
 * Handles Food Categories Master Data
 * ============================================================================
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // --------------------------------------------------------------------------
  // 🌐 PUBLIC / 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP / 🌐 PUBLIC] Get all active food categories
   * GET /categories
   */
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  /**
   * [📱 USER APP / 🌐 PUBLIC] Get single food category by ID
   * GET /categories/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Create a new food category
   * POST /categories
   */
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * [👑 ADMIN PANEL] Update food category
   * PATCH /categories/:id
   */
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * [👑 ADMIN PANEL] Delete food category
   * DELETE /categories/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
