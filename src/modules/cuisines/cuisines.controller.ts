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
import { CuisinesService } from './cuisines.service';
import { CreateCuisineDto } from './dto/create-cuisine.dto';
import { UpdateCuisineDto } from './dto/update-cuisine.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * ============================================================================
 * CUISINES MASTER CONTROLLER
 * Handles Cuisine Types Master Data (e.g. North Indian, Italian, Chinese)
 * ============================================================================
 */
@Controller('cuisines')
export class CuisinesController {
  constructor(private readonly cuisinesService: CuisinesService) {}

  // --------------------------------------------------------------------------
  // 🌐 PUBLIC / 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP / 🌐 PUBLIC] Get all active cuisines
   * GET /cuisines
   */
  @Get()
  findAll() {
    return this.cuisinesService.findAll();
  }

  /**
   * [📱 USER APP / 🌐 PUBLIC] Get single cuisine by ID
   * GET /cuisines/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cuisinesService.findOne(id);
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Create a new cuisine type
   * POST /cuisines
   */
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createCuisineDto: CreateCuisineDto) {
    return this.cuisinesService.create(createCuisineDto);
  }

  /**
   * [👑 ADMIN PANEL] Update cuisine type
   * PATCH /cuisines/:id
   */
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateCuisineDto: UpdateCuisineDto) {
    return this.cuisinesService.update(id, updateCuisineDto);
  }

  /**
   * [👑 ADMIN PANEL] Delete cuisine type
   * DELETE /cuisines/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.cuisinesService.remove(id);
  }
}
