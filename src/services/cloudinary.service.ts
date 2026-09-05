import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

if (env.cloudinary?.cloudName && env.cloudinary?.apiKey && env.cloudinary?.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
}

export class CloudinaryService {
  private static isConfigured(): boolean {
    return Boolean(env.cloudinary?.cloudName && env.cloudinary?.apiKey && env.cloudinary?.apiSecret);
  }

  static async uploadImage(filePath: string, folder: string = 'sakhisphere/posts'): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Cloudinary not configured. Using local file path.');
        return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1080, crop: 'limit' },
        ],
      });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary image upload failed:', error);
      return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
    }
  }

  static async uploadVideo(filePath: string, folder: string = 'sakhisphere/posts'): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov'],
        chunk_size: 6000000,
        eager: [
          { format: 'jpg', transformation: [{ width: 320, height: 240, crop: 'fill' }] }
        ],
        eager_async: true,
      });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      let thumbnailUrl;
      if (result.eager && result.eager.length > 0) {
        thumbnailUrl = result.eager[0].secure_url;
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        thumbnailUrl,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary video upload failed:', error);
      return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
    }
  }

  static async uploadDocument(filePath: string, folder: string = 'sakhisphere/verification'): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary document upload failed:', error);
      return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
    }
  }

  static async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    try {
      if (publicId && this.isConfigured()) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
        });
      }
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
    }
  }
}