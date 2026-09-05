import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CloudinaryService } from '../services/cloudinary.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type') as any);
    }
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 }, // 1GB for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video type. Allowed: MP4, WEBM, MOV') as any);
    }
  },
});

export class UploadController {
  /**
   * POST /api/upload/image
   */
  static async uploadImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload an image file' });
        return;
      }

      console.log(`📤 Uploading image: ${req.file.originalname}`);
      console.log(`📁 File size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);

      const folder = req.body.folder || `sakhisphere/posts/user_${req.user.id}`;
      const result = await CloudinaryService.uploadImage(req.file.path, folder);

      console.log('✅ Image upload result:', result);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Image upload error:', error);
      next(error);
    }
  }

  /**
   * POST /api/upload/video
   */
  static async uploadVideo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload a video file' });
        return;
      }

      console.log(`📤 Uploading video: ${req.file.originalname}`);
      console.log(`📁 File size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);

      const folder = req.body.folder || `sakhisphere/posts/user_${req.user.id}`;
      const result = await CloudinaryService.uploadVideo(req.file.path, folder);

      console.log('✅ Video upload result:', result);

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Video upload error:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/upload/:publicId
   */
  static async deleteFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { publicId } = req.params;
      const { resourceType } = req.query;

      if (!publicId) {
        res.status(400).json({ success: false, message: 'publicId is required' });
        return;
      }

      await CloudinaryService.deleteFile(
        publicId,
        (resourceType as 'image' | 'video' | 'raw') || 'image'
      );

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}