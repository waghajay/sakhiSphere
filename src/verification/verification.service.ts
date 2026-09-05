import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { CloudinaryService } from '../services/cloudinary.service';
import { emailService } from '../services/email.service';
import fs from 'fs';

export interface SubmitVerificationDto {
  verificationType: 'id_proof' | 'student_id' | 'work_id' | 'social_profile';
  documentNote?: string;
  filePath?: string;
  autoApprove?: boolean;
}

export class VerificationService {
  /**
   * Retrieves user verification status and submission history.
   */
  static async getStatus(userId: number) {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationRequests: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return {
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      latestRequest: user.verificationRequests[0] || null,
    };
  }

  /**
   * Submits a new verification request with document upload.
   */
  static async submitRequest(userId: number, data: SubmitVerificationDto) {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.isVerified) {
      throw new CustomError('Your profile is already verified! 🌸', 400);
    }

    // Check for pending requests
    const pendingRequest = await prisma.verificationRequest.findFirst({
      where: {
        userId,
        status: 'pending',
      },
    });

    if (pendingRequest) {
      throw new CustomError('You already have a verification request pending review.', 409);
    }

    // Upload document to Cloudinary if file path provided
    let documentUrl: string | null = null;
    let documentPublicId: string | null = null;

    if (data.filePath) {
      try {
        const uploadResult = await CloudinaryService.uploadImage(
          data.filePath,
          `sakhisphere/verification/user_${userId}`
        );
        documentUrl = uploadResult.url;
        documentPublicId = uploadResult.publicId;

        // Delete local file after upload
        if (fs.existsSync(data.filePath)) {
          fs.unlinkSync(data.filePath);
        }
      } catch (error) {
        console.error('Image upload failed:', error);
        // Don't throw - still create request without image
      }
    }

    // Create verification request (always pending)
    const request = await prisma.verificationRequest.create({
      data: {
        userId,
        status: 'pending',
        verificationType: data.verificationType,
        documentNote: data.documentNote || null,
        documentUrl,
        documentPublicId,
      },
    });

    return {
      requestId: request.id,
      status: 'pending',
      message: 'Verification request submitted successfully. Our team will review your documents within 24-48 hours.',
      documentUrl,
    };
  }

  /**
   * Admin reviews verification request.
   */
  static async reviewRequest(
    requestId: number,
    adminId: number,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ) {
    const prisma = getPrisma();

    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
      },
    });

    if (!request) {
      throw new CustomError('Verification request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new CustomError('This request has already been reviewed', 400);
    }

    // Update request
    await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status,
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    // Update user verification status
    if (status === 'approved') {
      await prisma.user.update({
        where: { id: request.userId },
        data: { isVerified: true },
      });

      // Send approval email
      try {
        await emailService.sendVerificationApprovedEmail(
          request.user.email,
          request.user.name
        );
      } catch (error) {
        console.error('Failed to send approval email:', error);
      }
    } else {
      // Send rejection email
      try {
        await emailService.sendVerificationRejectedEmail(
          request.user.email,
          request.user.name,
          adminNotes || 'The submitted document did not meet our verification requirements.'
        );
      } catch (error) {
        console.error('Failed to send rejection email:', error);
      }
    }

    return {
      requestId,
      status,
      message: status === 'approved'
        ? 'Verification request approved successfully'
        : 'Verification request rejected',
    };
  }

  /**
   * Gets all verification requests (for admin).
   */
  static async getAllRequests(page: number = 1, limit: number = 20) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.verificationRequest.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isVerified: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.verificationRequest.count(),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}