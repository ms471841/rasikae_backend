import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { UpdateContentDto } from './dto/update-content.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Public: Get list of all legal document summaries
  @Get()
  async getAllContent() {
    return this.contentService.getAllContents();
  }

  // Public: Get specific document by slug (e.g. /content/terms, /content/privacy)
  @Get(':slug')
  async getContentBySlug(@Param('slug') slug: string) {
    return this.contentService.getContentBySlug(slug.toLowerCase().trim());
  }

  // Admin Only: Upsert/Update content by slug
  @Put(':slug')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateContent(
    @Param('slug') slug: string,
    @Body() dto: UpdateContentDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user?.uid || req.user?.id || 'admin';
    return this.contentService.upsertContent(slug.toLowerCase().trim(), dto, adminUserId);
  }
}
