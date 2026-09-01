import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { QueryFaqDto } from './dto/query-faq.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // Public: List FAQs with filtering & search
  @Get()
  async getFaqs(@Query() query: QueryFaqDto) {
    return this.faqService.getFaqs(query);
  }

  // Public: Get all active FAQ categories
  @Get('categories')
  async getCategories() {
    return this.faqService.getCategories();
  }

  // Public: Get single FAQ by ID
  @Get(':id')
  async getFaqById(@Param('id') id: string) {
    return this.faqService.getFaqById(id);
  }

  // Admin: Create new FAQ
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.faqService.createFaq(dto);
  }

  // Admin: Update FAQ
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqService.updateFaq(id, dto);
  }

  // Admin: Delete FAQ
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteFaq(@Param('id') id: string) {
    return this.faqService.deleteFaq(id);
  }

  // Admin: Reorder multiple FAQs
  @Put('reorder')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async reorderFaqs(@Body() items: { id: string; order: number }[]) {
    return this.faqService.reorderFaqs(items);
  }
}
