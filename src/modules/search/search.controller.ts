import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';

/**
 * ============================================================================
 * GLOBAL SEARCH CONTROLLER
 * Handles Unified Location-Aware Search for Restaurants, Dishes & Categories
 * ============================================================================
 */
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP] Global location-aware search across restaurants, dishes & cuisines
   * GET /search?q=pizza&lat=...&lng=...&isVeg=true
   */
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
