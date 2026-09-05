import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProfileService } from './profile.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for profile photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profile');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile_' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.') as any);
    }
  },
});

export class ProfileController {
  /**
   * GET /api/profile (Protected)
   */
  static async getMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const profile = await ProfileService.getProfile(req.user.id);
      res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/profile (Protected)
   */
  static async updateMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { name, bio, location, occupation, avatar_url } = req.body;
      const updatedProfile = await ProfileService.updateProfile(req.user.id, {
        name,
        bio,
        location,
        occupation,
        avatarUrl: avatar_url,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/profile/photo (Protected) - Upload profile photo
   */
  static async uploadProfilePhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload a photo' });
        return;
      }

      const result = await ProfileService.uploadProfilePhoto(req.user.id, req.file.path);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/profile/:userId (Protected)
   */
  static async getPublicProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const targetUserId = parseInt(rawId, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const profile = await ProfileService.getPublicProfile(targetUserId);
      res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
      next(error);
    }
  }
}