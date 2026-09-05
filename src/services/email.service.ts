import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (env.smtp?.user && env.smtp?.pass) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host || 'smtp.gmail.com',
        port: env.smtp.port || 587,
        secure: false,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      });
      this.isConfigured = true;
    } else {
      console.warn('⚠️ Email service not configured. OTP will only be logged to console.');
    }
  }

  async sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      console.log(`📧 [EMAIL NOT SENT] To: ${to}, Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${env.smtp.fromName || 'SakhiSphere'}" <${env.smtp.fromEmail || env.smtp.user}>`,
        to,
        subject,
        html,
      });
      console.log(`📧 Email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async sendOtpEmail(email: string, otp: string, purpose: string): Promise<void> {
    const subject = `Your SakhiSphere Verification Code - ${otp}`;
    const purposeText = purpose === 'registration' 
      ? 'complete your registration' 
      : purpose === 'login' 
      ? 'sign in to your account' 
      : 'verify your identity';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f3ff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 48px; margin-bottom: 10px; }
          h1 { color: #7C3AED; margin: 0; font-size: 24px; }
          .otp-box { 
            background: #F3E8FF; 
            border: 2px dashed #7C3AED; 
            border-radius: 16px; 
            padding: 24px; 
            text-align: center; 
            margin: 30px 0;
          }
          .otp-code { 
            font-size: 40px; 
            font-weight: bold; 
            color: #7C3AED; 
            letter-spacing: 10px;
          }
          .info { color: #374151; line-height: 1.6; font-size: 14px; }
          .warning { 
            background: #FEF3C7; 
            border-radius: 8px; 
            padding: 12px; 
            margin-top: 20px;
            font-size: 13px;
            color: #92400E;
          }
          .footer { margin-top: 30px; text-align: center; color: #9CA3AF; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌸</div>
            <h1>SakhiSphere</h1>
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="info">
            <p>Hello,</p>
            <p>Use the code above to ${purposeText}. This code will expire in 10 minutes.</p>
          </div>
          <div class="warning">
            <strong>🔒 Security Tip:</strong> Never share this code with anyone.
          </div>
          <div class="footer">
            <p>🌸 SakhiSphere - Safe Socializing for Women</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  async sendVerificationApprovedEmail(email: string, userName: string): Promise<void> {
    const subject = '🎉 Your SakhiSphere Profile is Verified!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f3ff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; }
          h1 { color: #10B981; text-align: center; }
          .badge { background: #10B981; color: white; padding: 12px 24px; border-radius: 24px; display: inline-block; margin: 20px 0; }
          .content { color: #374151; line-height: 1.6; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification Approved!</h1>
          <div class="content">
            <p>Dear ${userName},</p>
            <p>Great news! Your identity verification has been approved.</p>
            <span class="badge">✓ Verified Sakhi Member</span>
            <p>Thank you for helping keep SakhiSphere safe!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  async sendVerificationRejectedEmail(email: string, userName: string, reason: string): Promise<void> {
    const subject = 'Update on Your SakhiSphere Verification';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f3ff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; }
          h1 { color: #DC2626; text-align: center; }
          .reason-box { background: #FEF2F2; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .content { color: #374151; line-height: 1.6; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification Update</h1>
          <div class="content">
            <p>Dear ${userName},</p>
            <p>Your verification request could not be approved.</p>
            <div class="reason-box">
              <strong>Reason:</strong> ${reason || 'Document did not meet requirements.'}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }
}

export const emailService = new EmailService();