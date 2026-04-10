import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_S3_REGION');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    
    const accessKey = this.configService.get<string>('AWS_S3_ACCESS_KEY');
    const secretKey = this.configService.get<string>('AWS_S3_SECRET_KEY');

    if (!this.region || !this.bucketName || !accessKey || !secretKey) {
      this.logger.warn('S3 configuration is incomplete. Uploads might fail.');
      return;
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Check your environment variables.');
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Note: In modern S3, public access is often blocked at bucket level. 
      // If your bucket is public, this ACL works. Otherwise, you access via CloudFront or Bucket Policy.
      // ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);
      
      // Construct the public URL (assuming the bucket has public read policy or is served via public URL)
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw new Error('FileUploadFailed');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.s3Client) return;

    try {
      // Extract the key from the URL
      const urlParts = fileUrl.split('.amazonaws.com/');
      if (urlParts.length < 2) return;
      
      const key = urlParts[1];

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
    }
  }
}
