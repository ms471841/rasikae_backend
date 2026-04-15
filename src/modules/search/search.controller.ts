import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(
    @Query('q') query: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('isVeg') isVeg?: string,
    @Query('minRating') minRating?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query "q" is required');
    }

    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    
    const filters = {
      isVeg: isVeg === 'true' ? true : isVeg === 'false' ? false : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
    };

    return this.searchService.searchAll(query, parsedLat, parsedLng, filters);
  }
}
