import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../config/database';
import { env } from '../config/env';
import { CustomError } from '../middleware/errorHandler';
import { emailService } from '../services/email.service';

export interface SanitizedUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  occupation?: string | null;
  isEmailVerified: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export class AuthService {
  /**
   * Generates and stores a 6-digit OTP.
   */
  static async generateOtp(
    email: string,
    purpose: 'registration' | 'login' | 'verification' = 'registration'
  ): Promise<string> {
    const prisma = getPrisma();
    const normalizedEmail = email.trim().toLowerCase();

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate previous active OTPs
    await prisma.otp.updateMany({
      where: {
        email: normalizedEmail,
        purpose,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Save new OTP
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        otpCode,
        purpose,
        expiresAt: new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000),
      },
    });

    // Send OTP via email
    try {
      await emailService.sendOtpEmail(normalizedEmail, otpCode, purpose);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
    }

    // Only log in development, never return to frontend
    if (env.nodeEnv === 'development') {
      console.log(`📱 [DEV ONLY] OTP for ${normalizedEmail}: ${otpCode}`);
    }

    return otpCode;
  }

  /**
   * Registers a new user.
   * IMPORTANT: Does NOT return OTP to frontend.
   */
  static async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ email: string }> {
    const prisma = getPrisma();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new CustomError('An account with this email already exists. Please log in.', 409);
      } else {
        // Update existing unverified user
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: trimmedName,
            passwordHash,
          },
        });
        await this.generateOtp(normalizedEmail, 'registration');
        // Return only email, NOT OTP
        return { email: normalizedEmail };
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with profile and settings
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          passwordHash,
          isEmailVerified: false,
          profile: {
            create: {
              bio: 'New member of SakhiSphere community 🌸',
              location: '',
              occupation: '',
            },
          },
          settings: {
            create: {},
          },
        },
      });
    });

    await this.generateOtp(normalizedEmail, 'registration');
    
    // Return only email, NOT OTP
    return { email: normalizedEmail };
  }

  /**
   * Verifies OTP and completes registration.
   */
  static async verifyOtp(
    email: string,
    code: string
  ): Promise<{ token: string; user: SanitizedUser }> {
    const prisma = getPrisma();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      throw new CustomError('Verification code must be 6 digits', 400);
    }

    const otp = await prisma.otp.findFirst({
      where: {
        email: normalizedEmail,
        otpCode: trimmedCode,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { id: 'desc' },
    });

    if (!otp) {
      throw new CustomError('Invalid or expired verification code', 400);
    }

    await prisma.otp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { isEmailVerified: true },
      include: {
        profile: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn } as jwt.SignOptions
    );

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Resends OTP.
   */
  static async resendOtp(
    email: string,
    purpose: 'registration' | 'login' | 'verification' = 'registration'
  ): Promise<{ email: string }> {
    const prisma = getPrisma();
    const normalizedEmail = email.trim().toLowerCase();

    if (purpose === 'login') {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw new CustomError('No account found with this email', 404);
      }
    }

    await this.generateOtp(normalizedEmail, purpose);
    return { email: normalizedEmail };
  }

  /**
   * Authenticates user.
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: SanitizedUser }> {
    const prisma = getPrisma();
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
      throw new CustomError('Please verify your email before logging in', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new CustomError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn } as jwt.SignOptions
    );

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Gets full profile with interests.
   */
  static async getProfile(userId: number): Promise<any> {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        interests: {
          include: {
            interest: true,
          },
        },
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      location: user.profile?.location,
      occupation: user.profile?.occupation,
      isEmailVerified: user.isEmailVerified,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      interests: user.interests.map(ui => ui.interest),
      privacy: {
        profileVisibility: user.profile?.privacyProfileVisibility || 'members_only',
        allowMessages: user.profile?.privacyAllowMessages || 'all_members',
        showOnlineStatus: user.profile?.privacyShowOnlineStatus ?? true,
      },
    };
  }

  /**
   * Sanitizes user object.
   */
  private static sanitizeUser(user: any): SanitizedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      location: user.profile?.location,
      occupation: user.profile?.occupation,
      isEmailVerified: user.isEmailVerified,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}