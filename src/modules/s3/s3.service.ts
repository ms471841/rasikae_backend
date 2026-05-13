import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_S3_REGION') || 'ap-south-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME')!;

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /** Generic upload — generates a UUID filename inside the given folder. */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general'
  ): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const s3Key = `${folder}/${uuidv4()}.${fileExtension}`;
    return this.uploadFileToKey(file, s3Key);
  }

  /**
   * Upload a file to a fully-formed S3 key (path + filename).
   * Use this for entity-scoped paths such as:
   *   users/{userId}/profile/avatar.jpg
   *   restaurants/{restaurantId}/logo.jpg
   *   restaurants/{restaurantId}/cover/{uuid}.jpg
   *   menu-items/{menuItemId}/image.jpg
   *   menu-items/{menuItemId}/thumbnail.jpg
   *
   * When a fixed key is used (no UUID), re-uploading will overwrite the
   * previous file in-place — no orphan objects accumulate in S3.
   */
  async uploadFileToKey(
    file: Express.Multer.File,
    s3Key: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
    } catch (error) {
      throw new BadRequestException(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3 by its key.
   * Useful for removing old cover images when the vendor removes them from
   * the restaurant gallery.
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(`S3 delete failed: ${error.message}`);
    }
  }
}
