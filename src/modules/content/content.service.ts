import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content, ContentDocument } from './schemas/content.schema';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly CACHE_PREFIX = 'content:';
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    @InjectModel(Content.name) private contentModel: Model<ContentDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async getContentBySlug(slug: string): Promise<ContentDocument> {
    const cacheKey = `${this.CACHE_PREFIX}${slug}`;
    const cached = await this.cacheService.get<ContentDocument>(cacheKey);
    if (cached) {
      return cached;
    }

    const doc = await this.contentModel.findOne({ slug }).exec();
    if (!doc) {
      // Return a clean default structure without throwing to keep clients resilient
      return {
        slug,
        title: this.formatDefaultTitle(slug),
        content: '',
        version: 1,
        isPublished: true,
      } as any;
    }

    await this.cacheService.set(cacheKey, doc.toJSON ? doc.toJSON() : doc, this.CACHE_TTL_SECONDS);
    return doc;
  }

  async getAllContents(): Promise<ContentDocument[]> {
    return this.contentModel
      .find()
      .select('slug title version isPublished updatedAt createdAt metaDescription')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async upsertContent(slug: string, dto: UpdateContentDto, adminUserId?: string): Promise<ContentDocument> {
    let doc = await this.contentModel.findOne({ slug }).exec();

    if (!doc) {
      doc = new this.contentModel({
        slug,
        title: dto.title || this.formatDefaultTitle(slug),
        content: dto.content || '',
        version: 1,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
        metaDescription: dto.metaDescription || '',
        lastUpdatedBy: adminUserId || 'admin',
      });
    } else {
      if (dto.title !== undefined) doc.title = dto.title;
      if (dto.content !== undefined) doc.content = dto.content;
      if (dto.isPublished !== undefined) doc.isPublished = dto.isPublished;
      if (dto.metaDescription !== undefined) doc.metaDescription = dto.metaDescription;
      doc.version = (doc.version || 1) + 1;
      doc.lastUpdatedBy = adminUserId || 'admin';
    }

    const saved = await doc.save();
    const cacheKey = `${this.CACHE_PREFIX}${slug}`;
    await this.cacheService.set(cacheKey, saved.toJSON ? saved.toJSON() : saved, this.CACHE_TTL_SECONDS);
    this.logger.log(`Updated CMS document for slug='${slug}' (v${saved.version})`);
    return saved;
  }

  private formatDefaultTitle(slug: string): string {
    switch (slug) {
      case 'terms':
        return 'Terms & Conditions';
      case 'privacy':
        return 'Privacy Policy';
      case 'about':
        return 'About Us';
      case 'refund':
        return 'Refund & Cancellation Policy';
      default:
        return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
    }
  }
}
