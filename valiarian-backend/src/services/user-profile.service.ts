import {BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {v4 as uuidv4} from 'uuid';
import {MediaRepository, OtpRepository, UsersRepository} from '../repositories';
import {BcryptHasher} from './hash.password.bcrypt';
import {OtpNotificationService} from './otp-notification.service';

@injectable({scope: BindingScope.TRANSIENT})
export class UserProfileService {
  constructor(
    @repository(UsersRepository)
    private usersRepository: UsersRepository,
    @repository(OtpRepository)
    private otpRepository: OtpRepository,
    @repository(MediaRepository)
    private mediaRepository: MediaRepository,
    @inject('services.otp.notification')
    private otpNotificationService: OtpNotificationService,
  ) { }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    const user = await this.usersRepository.findById(userId, {
      include: ['avatar'],
    }) as any;

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    // Return user without sensitive fields
    const {password, passwordHistory, ...profile} = user;

    // Include avatar URL if available
    const result = {
      ...profile,
      avatar: user.avatar?.url || null,
    };

    return result;
  }

  /**
   * Update user profile (name, address, etc.)
   */
  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
      avatarId?: string;
    },
  ) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    if (!user.isActive) {
      throw new HttpErrors.BadRequest('User account is not active');
    }

    // Update only provided fields
    await this.usersRepository.updateById(userId, {
      ...data,
      updatedAt: new Date(),
    });

    return this.getUserProfile(userId);
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, request: any) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    if (!user.isActive) {
      throw new HttpErrors.BadRequest('User account is not active');
    }

    // Extract uploaded files from request
    const uploadedFiles = request.files;
    console.log('Uploaded files:', uploadedFiles);

    if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
      throw new HttpErrors.BadRequest('No avatar file uploaded');
    }

    const avatarFile = uploadedFiles[0]; // Get the first uploaded file
    console.log('Avatar file:', avatarFile);

    // Create media record with actual file details
    const mediaId = uuidv4();
    const fileUrl = `${process.env.API_ENDPOINT}/media/${avatarFile.filename}`;

    console.log('Creating media record with URL:', fileUrl);

    const media = await this.mediaRepository.create({
      id: mediaId,
      filename: avatarFile.filename,
      originalName: avatarFile.originalname,
      mimeType: avatarFile.mimetype,
      size: avatarFile.size,
      url: fileUrl,
      folder: '/avatars',
      uploadedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Created media record:', media);

    // Update user with avatar relation
    await this.usersRepository.updateById(userId, {
      avatarId: media.id,
      updatedAt: new Date(),
    });

    console.log('Updated user with avatarId:', media.id);

    return {
      success: true,
      message: 'Avatar updated successfully',
      avatarUrl: media.url,
      avatarId: media.id,
    };
  }

  /**
   * Initiate email update - sends OTP to new email
   */
  async initiateEmailUpdate(userId: string, newEmail: string, hasher: BcryptHasher) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    // Check if email is already in use
    const existingUser = await this.usersRepository.findOne({
      where: {email: newEmail, isDeleted: false},
    });

    if (existingUser && existingUser.id !== userId) {
      throw new HttpErrors.BadRequest('Email is already in use');
    }

    // Invalidate old OTPs for this email
    await this.otpRepository.updateAll(
      {isUsed: true, expiresAt: new Date()},
      {identifier: newEmail, type: 1},
    );

    // Generate a real random 4-digit OTP for email verification.
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Hash OTP before storing
    const hashedOtp = await hasher.hashPassword(otpCode);

    const otp = await this.otpRepository.create({
      otp: hashedOtp,
      type: 1, // Email type
      identifier: newEmail,
      attempts: 0,
      isUsed: false,
      userId: userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    try {
      await this.otpNotificationService.sendEmailOtp(
        newEmail,
        otpCode,
        'email_update',
      );
    } catch (error) {
      await this.otpRepository.updateById(otp.id, {
        isUsed: true,
        expiresAt: new Date(),
      });

      console.error('Failed to send email update OTP:', error);
      throw new HttpErrors.InternalServerError(
        'Failed to send OTP email. Please try again.',
      );
    }

    return {
      success: true,
      message: 'OTP sent to new email address',
      otpId: otp.id,
    };
  }

  /**
   * Verify OTP and update email
   */
  async verifyAndUpdateEmail(
    userId: string,
    newEmail: string,
    otp: string,
    hasher: BcryptHasher,
  ) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    // Find OTP
    const otpEntry = await this.otpRepository.findOne({
      where: {
        identifier: newEmail,
        type: 1,
        isUsed: false,
        userId: userId,
      },
      order: ['createdAt DESC'],
    });

    if (!otpEntry) {
      throw new HttpErrors.BadRequest('OTP expired or not found');
    }

    if (otpEntry.attempts >= 3) {
      throw new HttpErrors.BadRequest(
        'Maximum attempts reached. Please request a new OTP.',
      );
    }

    if (new Date(otpEntry.expiresAt) < new Date()) {
      await this.otpRepository.updateById(otpEntry.id, {
        isUsed: true,
        expiresAt: new Date(),
      });
      throw new HttpErrors.BadRequest('OTP expired, request a new one');
    }

    // Verify OTP
    const isOtpValid = await hasher.comparePassword(otp, otpEntry.otp);

    if (!isOtpValid) {
      await this.otpRepository.updateById(otpEntry.id, {
        attempts: otpEntry.attempts + 1,
      });
      throw new HttpErrors.BadRequest('Invalid OTP');
    }

    // Mark OTP as used
    await this.otpRepository.updateById(otpEntry.id, {
      isUsed: true,
      expiresAt: new Date(),
    });

    // Update email
    await this.usersRepository.updateById(userId, {
      email: newEmail,
      isEmailVerified: true,
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: 'Email updated successfully',
    };
  }

  /**
   * Initiate mobile update - sends OTP to new mobile
   */
  async initiateMobileUpdate(userId: string, newMobile: string, hasher: BcryptHasher) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    // Check if mobile is already in use
    const existingUser = await this.usersRepository.findOne({
      where: {phone: newMobile, isDeleted: false},
    });

    if (existingUser && existingUser.id !== userId) {
      throw new HttpErrors.BadRequest('Mobile number is already in use');
    }

    // Invalidate old OTPs for this mobile
    await this.otpRepository.updateAll(
      {isUsed: true, expiresAt: new Date()},
      {identifier: newMobile, type: 0},
    );

    // Generate OTP - use hardcoded 1234 for testing in dev mode
    const otpCode = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();

    // Hash OTP before storing
    const hashedOtp = await hasher.hashPassword(otpCode);

    const otp = await this.otpRepository.create({
      otp: hashedOtp,
      type: 0, // Mobile type
      identifier: newMobile,
      attempts: 0,
      isUsed: false,
      userId: userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // Log OTP in development mode
    if (process.env.NODE_ENV === 'dev') {
      console.log(`Mobile update OTP for ${newMobile}: ${otpCode}`);
    }

    return {
      success: true,
      message: 'OTP sent to new mobile number',
      otpId: otp.id,
    };
  }

  /**
   * Verify OTP and update mobile
   */
  async verifyAndUpdateMobile(
    userId: string,
    newMobile: string,
    otp: string,
    hasher: BcryptHasher,
  ) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    // Find OTP
    const otpEntry = await this.otpRepository.findOne({
      where: {
        identifier: newMobile,
        type: 0,
        isUsed: false,
        userId: userId,
      },
      order: ['createdAt DESC'],
    });

    if (!otpEntry) {
      throw new HttpErrors.BadRequest('OTP expired or not found');
    }

    if (otpEntry.attempts >= 3) {
      throw new HttpErrors.BadRequest(
        'Maximum attempts reached. Please request a new OTP.',
      );
    }

    if (new Date(otpEntry.expiresAt) < new Date()) {
      await this.otpRepository.updateById(otpEntry.id, {
        isUsed: true,
        expiresAt: new Date(),
      });
      throw new HttpErrors.BadRequest('OTP expired, request a new one');
    }

    // Verify OTP
    const isOtpValid = await hasher.comparePassword(otp, otpEntry.otp);

    if (!isOtpValid) {
      await this.otpRepository.updateById(otpEntry.id, {
        attempts: otpEntry.attempts + 1,
      });
      throw new HttpErrors.BadRequest('Invalid OTP');
    }

    // Mark OTP as used
    await this.otpRepository.updateById(otpEntry.id, {
      isUsed: true,
      expiresAt: new Date(),
    });

    // Update mobile
    await this.usersRepository.updateById(userId, {
      phone: newMobile,
      isMobileVerified: true,
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: 'Mobile number updated successfully',
    };
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteAccount(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    if (user.isDeleted) {
      throw new HttpErrors.BadRequest('Account is already deleted');
    }

    // Soft delete
    await this.usersRepository.updateById(userId, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}
