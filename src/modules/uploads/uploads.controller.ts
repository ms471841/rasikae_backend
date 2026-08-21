import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../s3/s3.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  MenuItem,
  MenuItemDocument,
} from '../menu-items/schemas/menu-item.schema';
import { CurrUser } from '../auth/decorators/user.decorator';

const IMAGE_VALIDATORS = [
  new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
  new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
];

/**
 * ============================================================================
 * S3 UPLOADS CONTROLLER
 * Handles Image Uploads for User Avatars, Restaurant Logos/Covers, Dishes & Categories
 * ============================================================================
 */
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly s3Service: S3Service,
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  private static readonly ALLOWED_FOLDERS = [
    'general',
    'avatars',
    'covers',
    'menu',
    'categories',
    'cuisines',
    'temp',
  ];

  private sanitizeFolder(folder: string): string {
    const cleanFolder = (folder || 'general')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    if (!UploadsController.ALLOWED_FOLDERS.includes(cleanFolder)) {
      return 'general';
    }
    return cleanFolder;
  }

  // --------------------------------------------------------------------------
  // 🌐 GENERIC UPLOAD APIs
  // --------------------------------------------------------------------------

  /**
   * [🌐 COMMON / ALL APPS] Upload single image to S3 folder
   * POST /uploads/image?folder=general
   */
  @Post('image')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
    @Query('folder') folder: string = 'general',
  ) {
    if (!file) throw new BadRequestException('File is required');
    const safeFolder = this.sanitizeFolder(folder);
    const url = await this.s3Service.uploadFile(file, safeFolder);
    return { url };
  }

  /**
   * [🌐 COMMON / ALL APPS] Upload multiple images to S3 folder
   * POST /uploads/images?folder=general
   */
  @Post('images')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string = 'general',
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('Files are required');

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024)
        throw new BadRequestException(
          `File ${file.originalname} exceeds 5 MB limit`,
        );
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/))
        throw new BadRequestException(
          `File ${file.originalname} is not a valid image type`,
        );
    }

    const safeFolder = this.sanitizeFolder(folder);
    const urls = await Promise.all(
      files.map((f) => this.s3Service.uploadFile(f, safeFolder)),
    );
    return { urls };
  }

  // --------------------------------------------------------------------------
  // 📱 USER APP APIs
  // --------------------------------------------------------------------------

  /**
   * [📱 USER APP / ALL APPS] Upload user profile avatar
   * POST /uploads/user/:userId/profile
   */
  @Post('user/:userId/profile')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadUserProfilePicture(
    @CurrUser() user: any,
    @Param('userId') userId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (user.role !== 'admin' && user._id.toString() !== userId) {
      throw new ForbiddenException(
        'You cannot upload a profile picture for another user',
      );
    }
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `users/${userId}/profile/avatar.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  // --------------------------------------------------------------------------
  // 🍳 VENDOR APP & 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Upload restaurant logo image
   * POST /uploads/restaurant/:restaurantId/logo
   */
  @Post('restaurant/:restaurantId/logo')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadRestaurantLogo(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (user.role !== 'admin') {
      const restaurant = await this.restaurantModel
        .findById(restaurantId)
        .exec();
      if (!restaurant) throw new NotFoundException('Restaurant not found');
      if (restaurant.ownerId.toString() !== user._id.toString()) {
        throw new ForbiddenException(
          'You are not authorized to upload logo for this restaurant',
        );
      }
    }
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `restaurants/${restaurantId}/logo.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Upload restaurant cover gallery images
   * POST /uploads/restaurant/:restaurantId/cover
   */
  @Post('restaurant/:restaurantId/cover')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadRestaurantCoverImages(
    @CurrUser() user: any,
    @Param('restaurantId') restaurantId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (user.role !== 'admin') {
      const restaurant = await this.restaurantModel
        .findById(restaurantId)
        .exec();
      if (!restaurant) throw new NotFoundException('Restaurant not found');
      if (restaurant.ownerId.toString() !== user._id.toString()) {
        throw new ForbiddenException(
          'You are not authorized to upload cover images for this restaurant',
        );
      }
    }
    if (!files || files.length === 0)
      throw new BadRequestException('At least one file is required');

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024)
        throw new BadRequestException(
          `File ${file.originalname} exceeds 5 MB limit`,
        );
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/))
        throw new BadRequestException(
          `File ${file.originalname} is not a valid image type`,
        );
    }

    const urls = await Promise.all(
      files.map((file) => {
        const ext = file.originalname.split('.').pop();
        const s3Key = `restaurants/${restaurantId}/cover/${uuidv4()}.${ext}`;
        return this.s3Service.uploadFileToKey(file, s3Key);
      }),
    );
    return { urls };
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Upload menu item primary image
   * POST /uploads/menu-item/:menuItemId/image
   */
  @Post('menu-item/:menuItemId/image')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMenuItemImage(
    @CurrUser() user: any,
    @Param('menuItemId') menuItemId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (user.role !== 'admin') {
      const menuItem = await this.menuItemModel.findById(menuItemId).exec();
      if (!menuItem) throw new NotFoundException('Menu item not found');
      const restaurant = await this.restaurantModel
        .findById(menuItem.restaurantId)
        .exec();
      if (
        !restaurant ||
        restaurant.ownerId.toString() !== user._id.toString()
      ) {
        throw new ForbiddenException(
          'You are not authorized to upload image for this menu item',
        );
      }
    }
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `menu-items/${menuItemId}/image.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  /**
   * [🍳 VENDOR APP / 👑 ADMIN] Upload menu item thumbnail image
   * POST /uploads/menu-item/:menuItemId/thumbnail
   */
  @Post('menu-item/:menuItemId/thumbnail')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMenuItemThumbnail(
    @CurrUser() user: any,
    @Param('menuItemId') menuItemId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (user.role !== 'admin') {
      const menuItem = await this.menuItemModel.findById(menuItemId).exec();
      if (!menuItem) throw new NotFoundException('Menu item not found');
      const restaurant = await this.restaurantModel
        .findById(menuItem.restaurantId)
        .exec();
      if (
        !restaurant ||
        restaurant.ownerId.toString() !== user._id.toString()
      ) {
        throw new ForbiddenException(
          'You are not authorized to upload thumbnail for this menu item',
        );
      }
    }
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `menu-items/${menuItemId}/thumbnail.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  // --------------------------------------------------------------------------
  // 👑 ADMIN PANEL APIs
  // --------------------------------------------------------------------------

  /**
   * [👑 ADMIN PANEL] Upload food category icon/banner image
   * POST /uploads/category/:categoryId/image
   */
  @Post('category/:categoryId/image')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCategoryImage(
    @CurrUser() user: any,
    @Param('categoryId') categoryId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only admin users can upload category images',
      );
    }
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `categories/${categoryId}/image.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  /**
   * [👑 ADMIN PANEL] Upload cuisine icon/banner image
   * POST /uploads/cuisine/:cuisineId/image
   */
  @Post('cuisine/:cuisineId/image')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCuisineImage(
    @CurrUser() user: any,
    @Param('cuisineId') cuisineId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only admin users can upload cuisine images',
      );
    }
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `cuisines/${cuisineId}/image.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }
}
