// src/verification/verification.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VerificationService } from './verification.service';
import fs from 'fs';
import path from 'path';

export class VerificationController {
  /**
   * GET /api/verification/status (Protected)
   */
  static async getStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const status = await VerificationService.getStatus(req.user.id);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/verification/request (Protected, accepts base64 image)
   */
  static async submitRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { 
        verification_type, 
        document_note, 
        document_base64,
        document_mime_type,
        document_file_name 
      } = req.body;

      if (!verification_type) {
        res.status(400).json({ success: false, message: 'verification_type is required' });
        return;
      }

      let filePath: string | undefined;

      // Handle base64 image if provided
      if (document_base64) {
        try {
          // Create uploads directory if it doesn't exist
          const uploadDir = path.join(__dirname, '../../uploads/verification');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // Determine file extension from mime type
          const extension = document_mime_type === 'image/png' ? '.png' : 
                           document_mime_type === 'image/webp' ? '.webp' : '.jpg';
          
          const fileName = document_file_name || 
            `verification_${Date.now()}${extension}`;
          
          filePath = path.join(uploadDir, fileName);

          // Convert base64 to buffer and save
          const buffer = Buffer.from(document_base64, 'base64');
          fs.writeFileSync(filePath, buffer);
        } catch (error) {
          console.error('Failed to save base64 image:', error);
          res.status(400).json({ 
            success: false, 
            message: 'Invalid image data provided' 
          });
          return;
        }
      }

      const result = await VerificationService.submitRequest(req.user.id, {
        verificationType: verification_type,
        documentNote: document_note,
        filePath,
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/verification/review/:requestId (Admin only)
   */
  static async reviewRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const requestId = parseInt(req.params.requestId, 10);
      const { status, admin_notes } = req.body;

      if (!requestId || isNaN(requestId)) {
        res.status(400).json({ success: false, message: 'Invalid request ID' });
        return;
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
        return;
      }

      const result = await VerificationService.reviewRequest(
        requestId,
        req.user.id,
        status,
        admin_notes
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}