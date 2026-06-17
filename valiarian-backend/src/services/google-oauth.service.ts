import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import fetch from 'node-fetch';
import {v4 as uuidv4} from 'uuid';
import {RolesRepository, UserRolesRepository, UsersRepository} from '../repositories';
import {JWTService} from './jwt-service';
import {RbacService} from './rbac.service';

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

@injectable({scope: BindingScope.TRANSIENT})
export class GoogleOAuthService {
  constructor(
    @repository(UsersRepository)
    private usersRepository: UsersRepository,
    @repository(UserRolesRepository)
    private userRolesRepository: UserRolesRepository,
    @repository(RolesRepository)
    private rolesRepository: RolesRepository,
  ) { }

  /**
   * Get Google OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;

    if (!clientId || !redirectUri) {
      throw new HttpErrors.InternalServerError('Google OAuth not configured properly. Missing GOOGLE_CLIENT_ID or GOOGLE_CALLBACK_URL');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new HttpErrors.InternalServerError('Google OAuth not configured properly. Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GOOGLE_CALLBACK_URL');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      throw new HttpErrors.BadRequest('Failed to exchange authorization code');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new HttpErrors.BadRequest('Failed to get user info from Google');
    }

    return response.json();
  }

  /**
   * Find or create user from Google profile
   */
  async findOrCreateUser(googleUser: GoogleUserInfo): Promise<any> {
    const now = new Date();

    // Check if user exists by Google ID
    let user = await this.usersRepository.findOne({
      where: {googleId: googleUser.id, isDeleted: false},
    });

    if (user) {
      // Update fields if they changed or are missing
      await this.usersRepository.updateById(user.id, {
        fullName: user.fullName || googleUser.name,
        profilePicture: googleUser.picture,
        isEmailVerified: true,
        lastLoginAt: now,
        updatedAt: now,
      });
      return this.usersRepository.findById(user.id);
    }

    // Check if user exists by email
    user = await this.usersRepository.findOne({
      where: {email: googleUser.email, isDeleted: false},
    });

    if (user) {
      // Link Google account to existing user
      await this.usersRepository.updateById(user.id, {
        googleId: googleUser.id,
        fullName: user.fullName || googleUser.name,
        profilePicture: googleUser.picture,
        isEmailVerified: true,
        authProvider: 'google', // Update provider to google since they are using it now
        lastLoginAt: now,
        updatedAt: now,
      });
      return this.usersRepository.findById(user.id);
    }

    // Create new user (Fast process: No password required)
    const newUser = await this.usersRepository.create({
      id: uuidv4(),
      email: googleUser.email,
      fullName: googleUser.name,
      googleId: googleUser.id,
      profilePicture: googleUser.picture,
      isEmailVerified: true,
      isMobileVerified: false,
      isActive: true,
      isDeleted: false,
      authProvider: 'google',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    // Assign 'user' role
    let userRole = await this.rolesRepository.findOne({
      where: {value: 'user'},
    });

    if (!userRole) {
      console.log('User role not found, creating it...');
      userRole = await this.rolesRepository.create({
        id: uuidv4(),
        label: 'User',
        value: 'user',
        description: 'Regular user role',
        isActive: true,
      });
    }

    await this.userRolesRepository.create({
      id: uuidv4(),
      usersId: newUser.id,
      rolesId: userRole.id,
      isActive: true,
    });

    return newUser;
  }

  /**
   * Generate JWT token for Google authenticated user
   */
  async generateToken(user: any, jwtService: JWTService, rbacService: RbacService): Promise<string> {
    const {roles, permissions} = await rbacService.getUserRolesAndPermissions(user.id!);

    const userProfile: UserProfile & {
      roles: string[];
      permissions: string[];
      phoneNumber: string;
      fullName: string;
    } = {
      [securityId]: user.id!,
      id: user.id!,
      email: user.email,
      phoneNumber: user.phone || '',
      fullName: user.fullName || '',
      roles,
      permissions,
    };

    return jwtService.generateToken(userProfile);
  }
}
