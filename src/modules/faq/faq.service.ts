import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Faq, FaqDocument } from './schemas/faq.schema';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { QueryFaqDto } from './dto/query-faq.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);
  private readonly CACHE_KEY_CATEGORIES = 'faqs:categories';
  private readonly CACHE_TTL_SECONDS = 3600; // 1 hour

  constructor(
    @InjectModel(Faq.name) private faqModel: Model<FaqDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async getFaqs(query: QueryFaqDto) {
    const filter: FilterQuery<FaqDocument> = {};

    if (query.category && query.category !== 'ALL') {
      filter.category = query.category;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ question: regex }, { answer: regex }, { tags: regex }];
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 100;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.faqModel
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.faqModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCategories(): Promise<string[]> {
    const cached = await this.cacheService.get<string[]>(this.CACHE_KEY_CATEGORIES);
    if (cached) {
      return cached;
    }

    const categories = await this.faqModel.distinct('category', { isActive: true }).exec();
    const defaults = ['General', 'Orders', 'Payments', 'Account', 'Delivery', 'Safety'];
    const merged = Array.from(new Set([...defaults, ...categories])).filter(Boolean);

    await this.cacheService.set(this.CACHE_KEY_CATEGORIES, merged, this.CACHE_TTL_SECONDS);
    return merged;
  }

  async getFaqById(id: string): Promise<FaqDocument> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }
    return faq;
  }

  async createFaq(dto: CreateFaqDto): Promise<FaqDocument> {
    const maxOrder = await this.faqModel
      .findOne()
      .sort({ order: -1 })
      .select('order')
      .exec();
    const nextOrder = dto.order !== undefined ? dto.order : (maxOrder?.order || 0) + 1;

    const faq = new this.faqModel({
      ...dto,
      order: nextOrder,
    });

    const saved = await faq.save();
    await this.invalidateCache();
    this.logger.log(`Created new FAQ: '${saved.question}'`);
    return saved;
  }

  async updateFaq(id: string, dto: UpdateFaqDto): Promise<FaqDocument> {
    const updated = await this.faqModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }
    await this.invalidateCache();
    this.logger.log(`Updated FAQ id='${id}'`);
    return updated;
  }

  async deleteFaq(id: string): Promise<{ success: boolean; message: string }> {
    const deleted = await this.faqModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`FAQ with ID '${id}' not found`);
    }
    await this.invalidateCache();
    this.logger.log(`Deleted FAQ id='${id}'`);
    return { success: true, message: 'FAQ deleted successfully' };
  }

  async reorderFaqs(items: { id: string; order: number }[]): Promise<{ success: boolean }> {
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order } },
      },
    }));

    if (bulkOps.length > 0) {
      await this.faqModel.bulkWrite(bulkOps);
    }
    await this.invalidateCache();
    return { success: true };
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheService.del(this.CACHE_KEY_CATEGORIES);
  }
}
