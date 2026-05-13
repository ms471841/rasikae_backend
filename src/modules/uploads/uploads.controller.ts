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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../s3/s3.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_VALIDATORS = [
  new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
  new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
];

@Controller('uploads')
export class UploadsController {
  constructor(private readonly s3Service: S3Service) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GENERIC endpoints (kept for backward compatibility)
  // ─────────────────────────────────────────────────────────────────────────

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
    @Query('folder') folder: string = 'general',
  ) {
    if (!file) throw new BadRequestException('File is required');
    const url = await this.s3Service.uploadFile(file, folder);
    return { url };
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string = 'general',
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('Files are required');

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024)
        throw new BadRequestException(`File ${file.originalname} exceeds 5 MB limit`);
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/))
        throw new BadRequestException(`File ${file.originalname} is not a valid image type`);
    }

    const urls = await Promise.all(
      files.map((f) => this.s3Service.uploadFile(f, folder)),
    );
    return { urls };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENTITY-SCOPED endpoints
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /uploads/user/:userId/profile
   * S3 key: users/{userId}/profile/avatar.{ext}
   * Fixed key → always overwrites the previous profile picture in-place.
   */
  @Post('user/:userId/profile')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadUserProfilePicture(
    @Param('userId') userId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `users/${userId}/profile/avatar.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  /**
   * POST /uploads/restaurant/:restaurantId/logo
   * S3 key: restaurants/{restaurantId}/logo.{ext}
   * Fixed key → always overwrites the previous logo in-place.
   */
  @Post('restaurant/:restaurantId/logo')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadRestaurantLogo(
    @Param('restaurantId') restaurantId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `restaurants/${restaurantId}/logo.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  /**
   * POST /uploads/restaurant/:restaurantId/cover
   * S3 key: restaurants/{restaurantId}/cover/{uuid}.{ext}
   * UUID key → multiple cover images can coexist (gallery).
   * Accepts up to 5 files in a single request.
   */
  @Post('restaurant/:restaurantId/cover')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadRestaurantCoverImages(
    @Param('restaurantId') restaurantId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('At least one file is required');

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024)
        throw new BadRequestException(`File ${file.originalname} exceeds 5 MB limit`);
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/))
        throw new BadRequestException(`File ${file.originalname} is not a valid image type`);
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
   * POST /uploads/menu-item/:menuItemId/image
   * S3 key: menu-items/{menuItemId}/image.{ext}
   * Fixed key → always overwrites the previous primary image in-place.
   */
  @Post('menu-item/:menuItemId/image')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMenuItemImage(
    @Param('menuItemId') menuItemId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `menu-items/${menuItemId}/image.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }

  /**
   * POST /uploads/menu-item/:menuItemId/thumbnail
   * S3 key: menu-items/{menuItemId}/thumbnail.{ext}
   * Fixed key → always overwrites the previous thumbnail in-place.
   */
  @Post('menu-item/:menuItemId/thumbnail')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMenuItemThumbnail(
    @Param('menuItemId') menuItemId: string,
    @UploadedFile(new ParseFilePipe({ validators: IMAGE_VALIDATORS }))
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const ext = file.originalname.split('.').pop();
    const s3Key = `menu-items/${menuItemId}/thumbnail.${ext}`;
    const url = await this.s3Service.uploadFileToKey(file, s3Key);
    return { url };
  }
}

