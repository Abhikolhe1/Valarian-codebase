import {inject} from '@loopback/core';
import SITE_SETTINGS from '../utils/config';
import {EmailService} from './email.service';

export class OtpNotificationService {
  constructor(
    @inject('services.email')
    private emailService: EmailService,
  ) { }

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
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p class="warning">⚠️ If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your OTP code is: ${otp}. This code will expire in 10 minutes. Use it to ${purposeText[purpose]}.`,
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
   * Send OTP via SMS
   * @param phone - Recipient phone number
   * @param otp - OTP code
   * @param purpose - Purpose of OTP
   *
   * NOTE: This is a placeholder implementation. In production, integrate with:
   * - Twilio: https://www.twilio.com/docs/sms/quickstart/node
   * - AWS SNS: https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html
   * - Other SMS providers
   */
  async sendSmsOtp(
    phone: string,
    otp: string,
    purpose: 'registration' | 'password_reset' | 'mobile_update' = 'registration',
  ): Promise<void> {
    const purposeText = {
      registration: 'verify your phone for registration',
      password_reset: 'reset your password',
      mobile_update: 'verify your new phone number',
    };

    // TODO: Integrate with actual SMS provider
    // Example with Twilio:
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: `Your OTP code is: ${otp}. Valid for 10 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });

    // For now, log to console in development
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
      console.log('📱 SMS OTP (Development Mode):');
      console.log(`   Phone: ${phone}`);
      console.log(`   OTP: ${otp}`);
      console.log(`   Purpose: ${purposeText[purpose]}`);
      console.log(`   ⚠️  In production, integrate with SMS provider (Twilio, AWS SNS, etc.)`);
    } else {
      // In production without SMS provider, throw error
      throw new Error(
        'SMS service not configured. Please contact administrator or use email verification.',
      );
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
