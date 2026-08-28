import {inject} from '@loopback/core';
import SITE_SETTINGS from '../utils/config';
import {EmailService} from './email.service';
import {OtpDeliveryChannel, OtpPurpose} from '../types/otp.types';
import {WhatsAppService} from './whatsapp.service';
import {OTP_CONFIG} from '../utils/otp-config';

export class OtpNotificationService {
  constructor(
    @inject('services.email')
    private emailService: EmailService,
    @inject('services.whatsapp')
    private whatsappService: WhatsAppService,
  ) { }

  async sendOtp(options: {
    channel: OtpDeliveryChannel;
    identifier: string;
    code: string;
    purpose: OtpPurpose;
  }): Promise<string | undefined> {
    if (options.channel === 'whatsapp') {
      return this.whatsappService.sendAuthenticationOtp(options.identifier, options.code);
    }
    const emailPurpose = options.purpose === OtpPurpose.PASSWORD_RESET
      ? 'password_reset'
      : options.purpose === OtpPurpose.EMAIL_VERIFICATION
        ? 'email_update'
        : 'registration';
    await this.sendEmailOtp(options.identifier, options.code, emailPurpose);
    return undefined;
  }

  /**
   * Send OTP via email
   * @param email - Recipient email address
   * @param otp - OTP code
   * @param purpose - Purpose of OTP (registration, password reset, etc.)
   */
  async sendEmailOtp(
    email: string,
    otp: string,
    purpose: 'registration' | 'password_reset' | 'email_update' = 'registration',
  ): Promise<void> {
    const purposeText = {
      registration: 'verify your email for registration',
      password_reset: 'reset your password',
      email_update: 'verify your new email address',
    };

    const mailOptions = {
      from: SITE_SETTINGS.fromMail,
      to: email,
      subject: `Your OTP Code - ${this.capitalize(purpose.replace('_', ' '))}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { color: #d32f2f; font-size: 14px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>OTP Verification</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You requested an OTP to ${purposeText[purpose]}. Please use the following code:</p>
              <div class="otp-code">${otp}</div>
              <p>This code will expire in <strong>${Math.ceil(OTP_CONFIG.expirySeconds / 60)} minutes</strong>.</p>
              <p class="warning">⚠️ If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your OTP code is: ${otp}. This code will expire in ${Math.ceil(OTP_CONFIG.expirySeconds / 60)} minutes. Use it to ${purposeText[purpose]}.`,
    };

    try {
      await this.emailService.sendMail(mailOptions);
      console.log(`✅ Email OTP sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send email OTP:', error);
      throw new Error('Failed to send OTP email. Please try again later.');
    }
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalize(text: string): string {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
