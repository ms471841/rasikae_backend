import { Injectable, BadRequestException } from '@nestjs/common';
import { v2, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder: `rasikae/${folder}`,
          resource_type: 'auto',
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            return reject(new BadRequestException(`Cloudinary upload failed: ${error.message}`));
          }
          resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(upload);
    });
  }
}
