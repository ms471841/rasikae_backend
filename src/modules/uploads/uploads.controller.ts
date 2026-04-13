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
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    ) file: Express.Multer.File,
    @Query('folder') folder: string = 'general'
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    const url = await this.cloudinaryService.uploadFile(file, folder);
    return { url };
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string = 'general'
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Files are required');
    }

    // Manual validation for multiple files since ParseFilePipe is tricky with arrays
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException(`File ${file.originalname} exceeds 5MB limit`);
      }
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        throw new BadRequestException(`File ${file.originalname} is not a valid image type`);
      }
    }

    const uploadPromises = files.map(file => this.cloudinaryService.uploadFile(file, folder));
    const urls = await Promise.all(uploadPromises);
    
    return { urls };
  }
}
