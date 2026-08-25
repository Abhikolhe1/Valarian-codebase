import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {del, get, HttpErrors, param, patch, post, Request, requestBody, Response, RestBindings} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import * as crypto from 'crypto';
import _ from 'lodash';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {OtpRepository, RefreshTokenRepository, RegistrationSessionsRepository, RolesRepository, UserRolesRepository, UsersRepository} from '../repositories';
import {CacheService} from '../services/cache.service';
import {GoogleOAuthService} from '../services/google-oauth.service';
import {BcryptHasher} from '../services/hash.password.bcrypt';
import {JWTService} from '../services/jwt-service';
import {MediaService} from '../services/media.service';
import {OtpNotificationService} from '../services/otp-notification.service';
import {OtpService} from '../services/otp.service';
import {RateLimiterService} from '../services/rate-limiter.service';
import {RbacService} from '../services/rbac.service';
import {UserProfileService} from '../services/user-profile.service';
import {MyUserService} from '../services/user-service';
import {FileUploadHandler} from '../types';
import {formatDeviceInfo, parseDeviceInfo} from '../utils/device-info.utils';
import {sanitizeInput, validateAndCheckPassword, validateAndSanitizeEmail, validateAndSanitizeMobile} from '../utils/validation.utils';
import {OtpIdentifierType, OtpPurpose} from '../types/otp.types';
import {OTP_CONFIG} from '../utils/otp-config';

export class AuthController {
  constructor(
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
    @repository(RolesRepository)
    private rolesRepository: RolesRepository,
    @repository(UserRolesRepository)
    private userRolesRepository: UserRolesRepository,
    @repository(OtpRepository)
    private otpRepository: OtpRepository,
    @repository(RegistrationSessionsRepository)
    private registrationSessionsRepository: RegistrationSessionsRepository,
    @repository(RefreshTokenRepository)
    private refreshTokenRepository: RefreshTokenRepository,
    @inject('service.hasher')
    private hasher: BcryptHasher,
    @inject('service.user.service')
    public userService: MyUserService,
    @inject('service.jwt.service')
    public jwtService: JWTService,
    @inject('services.rbac')
    public rbacService: RbacService,
    @inject('service.media.service')
    private mediaService: MediaService,
    @inject('service.google.oauth')
    private googleOAuthService: GoogleOAuthService,
    @inject('service.user.profile')
    private userProfileService: UserProfileService,
    @inject('service.rate.limiter')
    private rateLimiterService: RateLimiterService,
    @inject('services.otp.notification')
    private otpNotificationService: OtpNotificationService,
    @inject('services.otp')
    private otpService: OtpService,
    @inject('services.cache')
    private cacheService: CacheService,
    @inject(RestBindings.Http.REQUEST)
    private request: Request,
    @inject(FILE_UPLOAD_SERVICE)
    private handler: FileUploadHandler,
  ) { }

  // Helper method to get client IP address
  private getClientIp(): string {
    const forwarded = this.request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return this.request.socket.remoteAddress || '127.0.0.1';
  }

  // Resolves which panel role a user should be signed in as.
  // Super admin wins when a user happens to hold both roles.
  private async resolvePanelRole(userId: string): Promise<'super_admin' | 'admin' | null> {
    const userRoles = await this.userRolesRepository.find({
      where: {usersId: userId},
    });

    if (!userRoles.length) {
      return null;
    }

    const roles = await this.rolesRepository.find({
      where: {id: {inq: userRoles.map(item => item.rolesId)}},
    });

    const roleValues = roles.map(role => role.value);

    if (roleValues.includes('super_admin')) {
      return 'super_admin';
    }

    if (roleValues.includes('admin')) {
      return 'admin';
    }

    return null;
  }

  private async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.updateAll(
      {
        isRevoked: true,
        updatedAt: new Date(),
      },
      {
        userId,
        isRevoked: false,
      },
    );
  }

  // ---------------------------------------Super Admin Auth API's------------------------------------
  @post('/api/auth/super-admin')
  async createSuperAdmin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'phone', 'password', 'fullName'],
            properties: {
              email: {type: 'string'},
              phone: {type: 'string'},
              password: {type: 'string'},
              fullName: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      fullName: string;
      email: string;
      phone: string;
      password: string
    },
  ): Promise<{success: boolean; message: string; userId: string}> {
    const superadminRole = await this.rolesRepository.findOne({
      where: {value: 'super_admin'},
    });

    if (!superadminRole) {
      throw new HttpErrors.BadRequest(
        'Superadmin role does not exist in roles table',
      );
    }

    const existingSuperadmin = await this.userRolesRepository.findOne({
      where: {rolesId: superadminRole.id},
    });

    if (existingSuperadmin) {
      throw new HttpErrors.BadRequest('Super Admin already exists');
    }

    const existUser = await this.usersRepository.findOne({
      where: {email: body.email},
    });

    if (existUser) {
      throw new HttpErrors.BadRequest('User already exists with this email');
    }

    const hashedPassword = await this.hasher.hashPassword(body.password);

    const newUser = await this.usersRepository.create({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      password: hashedPassword,
      isActive: true,
    });

    await this.userRolesRepository.create({
      usersId: newUser.id!,
      rolesId: superadminRole.id!,
    });

    return {
      success: true,
      message: 'Super Admin created successfully',
      userId: newUser.id,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @post('/api/auth/admin')
  async createAdmin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'phone', 'password', 'fullName'],
            properties: {
              email: {type: 'string'},
              phone: {type: 'string'},
              password: {type: 'string'},
              fullName: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      fullName: string;
      email: string;
      phone: string;
      password: string
    },
  ): Promise<{success: boolean; message: string; userId: string}> {
    const adminRole = await this.rolesRepository.findOne({
      where: {value: 'admin'},
    });

    if (!adminRole) {
      throw new HttpErrors.BadRequest('Admin role does not exist in roles table');
    }

    const existUser = await this.usersRepository.findOne({
      where: {email: body.email},
    });

    if (existUser) {
      throw new HttpErrors.BadRequest('User already exists with this email');
    }

    const hashedPassword = await this.hasher.hashPassword(body.password);

    const newUser = await this.usersRepository.create({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      password: hashedPassword,
      isActive: true,
    });

    await this.userRolesRepository.create({
      usersId: newUser.id!,
      rolesId: adminRole.id!,
      isActive: true,
      isDeleted: false,
    });

    return {
      success: true,
      message: 'Admin created successfully',
      userId: newUser.id,
    };
  }

  // Single entry point for the admin panel: the role (super_admin / admin) is
  // derived from the account itself and carried in the issued token, instead
  // of the user picking a role-specific login form.
  @post('/api/auth/login')
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: {type: 'string'},
              password: {type: 'string'},
              rememberMe: {type: 'boolean'}
            }
          }
        }
      }
    })
    body: {email: string; password: string; rememberMe?: boolean}
  ): Promise<{success: boolean; message: string; accessToken: string; user: object}> {
    // Rate limiting: 5 login attempts per 15 minutes per IP
    const clientIp = this.getClientIp();
    this.rateLimiterService.checkLoginAttempt(clientIp);

    const userData = await this.usersRepository.findOne({
      where: {
        and: [
          {email: body.email},
          {isDeleted: false}
        ]
      }
    });

    if (!userData) {
      throw new HttpErrors.BadRequest('User not exist');
    }

    const user = await this.userService.verifyCredentials(body);

    const panelRole = await this.resolvePanelRole(user.id!);

    if (!panelRole) {
      throw new HttpErrors.Forbidden('Access denied. This account cannot access the admin panel.');
    }

    const {roles, permissions} = await this.rbacService.getUserRoleAndPermissionsByRole(
      user.id!,
      panelRole,
    );

    // Reset login attempts on successful login
    this.rateLimiterService.resetLoginAttempts(clientIp);

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

    const token = await this.jwtService.generateToken(userProfile);
    const profile = await this.rbacService.returnSuperAdminProfile(user.id, roles, permissions);

    // Parse device info from user-agent
    const userAgent = this.request.headers['user-agent'] || 'Unknown';
    const deviceInfo = parseDeviceInfo(userAgent);
    const formattedDeviceInfo = formatDeviceInfo(deviceInfo);

    // Create refresh token (optional - won't break login if it fails)
    try {
      const refreshToken = crypto.randomBytes(32).toString('hex');
      await this.refreshTokenRepository.create({
        id: uuidv4(),
        userId: user.id,
        token: refreshToken,
        deviceInfo: formattedDeviceInfo,
        ipAddress: clientIp,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isRevoked: false,
      });

      // Set refresh token as httpOnly cookie
      this.request.res?.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    } catch (refreshTokenError) {
      console.error('Failed to create refresh token:', refreshTokenError);
      // Continue with login even if refresh token creation fails
    }

    return {
      success: true,
      message: panelRole === 'super_admin' ? 'Super Admin login successful' : 'Admin login successful',
      accessToken: token,
      user: profile
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @get('/api/auth/admins')
  async getAdmins(
    @param.query.number('page') page = 1,
    @param.query.number('limit') limit = 10,
    @param.query.string('search') search?: string,
    @param.query.string('sortBy') sortBy = 'createdAt',
    @param.query.string('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{admins: object[]; pagination: object}> {
    const adminRole = await this.rolesRepository.findOne({
      where: {value: 'admin'},
    });

    if (!adminRole) {
      return {
        admins: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const adminAssignments = await this.userRolesRepository.find({
      where: {
        rolesId: adminRole.id,
        isDeleted: false,
      },
    });

    const adminUserIds = adminAssignments.map((item) => item.usersId).filter(Boolean);

    if (!adminUserIds.length) {
      return {
        admins: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const where: any = {
      id: {inq: adminUserIds},
      isDeleted: false,
    };

    if (search) {
      where.or = [
        {fullName: {like: `%${search}%`, options: 'i'}},
        {email: {like: `%${search}%`, options: 'i'}},
        {phone: {like: `%${search}%`, options: 'i'}},
      ];
    }

    const total = await this.usersRepository.count(where);

    const admins = await this.usersRepository.find({
      where,
      order: [`${sortBy} ${sortOrder}`],
      limit,
      skip: (page - 1) * limit,
    });

    return {
      admins,
      pagination: {
        total: total.count,
        page,
        limit,
        totalPages: Math.ceil(total.count / limit),
      },
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/auth/users')
  async getUsers(
    @param.query.number('page') page = 1,
    @param.query.number('limit') limit = 10,
    @param.query.string('search') search?: string,
    @param.query.string('status') status?: string,
    @param.query.string('sortBy') sortBy = 'createdAt',
    @param.query.string('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{users: object[]; pagination: object; counts: object}> {
    const userRole = await this.rolesRepository.findOne({
      where: {value: 'user'},
    });

    if (!userRole) {
      return {
        users: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        counts: {
          all: 0,
          active: 0,
          blocked: 0,
        },
      };
    }

    const userAssignments = await this.userRolesRepository.find({
      where: {
        rolesId: userRole.id,
        isDeleted: false,
      },
    });

    const userIds = userAssignments.map((item) => item.usersId).filter(Boolean);

    if (!userIds.length) {
      return {
        users: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        counts: {
          all: 0,
          active: 0,
          blocked: 0,
        },
      };
    }

    const where: any = {
      id: {inq: userIds},
      isDeleted: false,
    };

    if (status === 'active') {
      where.isActive = true;
    }

    if (status === 'blocked') {
      where.isActive = false;
    }

    if (search) {
      where.or = [
        {fullName: {like: `%${search}%`, options: 'i'}},
        {email: {like: `%${search}%`, options: 'i'}},
        {phone: {like: `%${search}%`, options: 'i'}},
      ];
    }

    const total = await this.usersRepository.count(where);

    const users = await this.usersRepository.find({
      where,
      fields: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
      order: [`${sortBy} ${sortOrder}`],
      limit,
      skip: (page - 1) * limit,
    });

    const [allCount, activeCount, blockedCount] = await Promise.all([
      this.usersRepository.count({id: {inq: userIds}, isDeleted: false}),
      this.usersRepository.count({id: {inq: userIds}, isDeleted: false, isActive: true}),
      this.usersRepository.count({id: {inq: userIds}, isDeleted: false, isActive: false}),
    ]);

    return {
      users: users.map((user) => ({
        ...user,
        role: 'user',
        status: user.isActive ? 'active' : 'blocked',
      })),
      pagination: {
        total: total.count,
        page,
        limit,
        totalPages: Math.ceil(total.count / limit),
      },
      counts: {
        all: allCount.count,
        active: activeCount.count,
        blocked: blockedCount.count,
      },
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @patch('/api/auth/users/{id}/status')
  async updateUserStatus(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['isActive'],
            properties: {
              isActive: {type: 'boolean'},
            },
          },
        },
      },
    })
    body: {isActive: boolean},
  ): Promise<{success: boolean; message: string}> {
    const existingUser = await this.usersRepository.findById(id);

    if (existingUser.isDeleted) {
      throw new HttpErrors.NotFound('User not found');
    }

    const {roles} = await this.rbacService.getUserRolesAndPermissions(id);

    if (!roles.includes('user')) {
      throw new HttpErrors.BadRequest('Only customer users can be blocked or unblocked');
    }

    await this.usersRepository.updateById(id, {
      isActive: body.isActive,
      updatedAt: new Date(),
    });

    if (!body.isActive) {
      await this.revokeUserRefreshTokens(id);
    }

    return {
      success: true,
      message: body.isActive ? 'User unblocked successfully' : 'User blocked successfully',
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @get('/api/auth/admins/{id}')
  async getAdminById(
    @param.path.string('id') id: string,
  ): Promise<object> {
    const user = await this.usersRepository.findById(id);

    if (user.isDeleted) {
      throw new HttpErrors.NotFound('Admin not found');
    }

    const {roles, permissions} = await this.rbacService.getUserRolesAndPermissions(id);

    if (!roles.includes('admin')) {
      throw new HttpErrors.NotFound('Admin not found');
    }

    return {
      ...user,
      roles,
      permissions,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @patch('/api/auth/admins/{id}')
  async updateAdmin(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fullName: {type: 'string'},
              email: {type: 'string'},
              phone: {type: 'string'},
              password: {type: 'string'},
              isActive: {type: 'boolean'},
            },
          },
        },
      },
    })
    body: {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      isActive?: boolean;
    },
  ): Promise<{success: boolean; message: string}> {
    const existingUser = await this.usersRepository.findById(id);

    if (existingUser.isDeleted) {
      throw new HttpErrors.NotFound('Admin not found');
    }

    const {roles} = await this.rbacService.getUserRolesAndPermissions(id);

    if (!roles.includes('admin')) {
      throw new HttpErrors.NotFound('Admin not found');
    }

    if (body.email && body.email !== existingUser.email) {
      const duplicateEmailUser = await this.usersRepository.findOne({
        where: {
          and: [
            {email: body.email},
            {id: {neq: id}},
          ],
        },
      });

      if (duplicateEmailUser) {
        throw new HttpErrors.BadRequest('User already exists with this email');
      }
    }

    const updatePayload: Partial<typeof existingUser> = {
      updatedAt: new Date(),
    };

    if (typeof body.fullName !== 'undefined') {
      updatePayload.fullName = body.fullName;
    }

    if (typeof body.email !== 'undefined') {
      updatePayload.email = body.email;
    }

    if (typeof body.phone !== 'undefined') {
      updatePayload.phone = body.phone;
    }

    if (typeof body.isActive !== 'undefined') {
      updatePayload.isActive = body.isActive;
    }

    if (body.password) {
      updatePayload.password = await this.hasher.hashPassword(body.password);
    }

    await this.usersRepository.updateById(id, updatePayload);

    if (updatePayload.isActive === false) {
      await this.revokeUserRefreshTokens(id);
    }

    return {
      success: true,
      message: 'Admin updated successfully',
    };
  }

  // --------------------------------------------Comman Auth API's-------------------------------------
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @post('/api/auth/update-password')
  async updatePassword(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['oldPassword', 'newPassword'],
            properties: {
              oldPassword: {type: 'string'},
              newPassword: {type: 'string'}
            }
          }
        }
      }
    })
    body: {
      oldPassword: string;
      newPassword: string;
    }
  ): Promise<{success: boolean; message: string}> {
    // Validate new password strength
    validateAndCheckPassword(body.newPassword);

    const user = await this.usersRepository.findById(currentUser.id);

    if (!user) {
      throw new HttpErrors.NotFound('No user found with given credentials');
    }

    const oldHashedPassword = user.password;
    const isValidPassword = await this.hasher.comparePassword(body.oldPassword, oldHashedPassword!);

    if (!isValidPassword) {
      throw new HttpErrors.BadRequest('Invalid old password');
    }

    const hashedPassword = await this.hasher.hashPassword(body.newPassword);

    await this.usersRepository.updateById(user.id, {password: hashedPassword});

    return {
      success: true,
      message: "Password updated successfully"
    }
  }

  @authenticate('jwt')
  @get('/api/auth/me')
  async whoAmI(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
  ): Promise<{}> {
    const user = await this.usersRepository.findOne({
      where: {
        id: currentUser.id,
      },
      fields: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        authProvider: true,
        profilePicture: true,
        avatarId: true,
        createdAt: true,
        updatedAt: true,
      },
      include: [{relation: 'avatar', scope: {fields: {url: true}}}],
    }) as any;

    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    const tokenRoles = Array.isArray((currentUser as any)?.roles)
      ? ((currentUser as any).roles as string[])
      : [];
    const tokenPermissions = Array.isArray((currentUser as any)?.permissions)
      ? ((currentUser as any).permissions as string[])
      : [];
    const hasTokenAuthContext = tokenRoles.length > 0 || tokenPermissions.length > 0;

    const {roles, permissions} = hasTokenAuthContext
      ? {roles: tokenRoles, permissions: tokenPermissions}
      : await this.rbacService.getUserRolesAndPermissions(user.id!);

    const userData = _.omit(user, ['password']);

    return Promise.resolve({
      ...userData,
      authProvider: user.authProvider || 'local',
      avatar: user.avatar?.url || null,
      roles: roles || currentUser?.roles || [],
      permissions: permissions || currentUser?.permissions || []
    });
  }

  @authenticate('jwt')
  @patch('/api/auth/me')
  async updateMyProfile(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fullName: {type: 'string'},
              email: {type: 'string'},
              phone: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      fullName?: string;
      email?: string;
      phone?: string;
    },
  ): Promise<object> {
    const existingUser = await this.usersRepository.findById(currentUser.id);

    if (!existingUser || existingUser.isDeleted) {
      throw new HttpErrors.NotFound('User not found');
    }

    const updatePayload: Partial<typeof existingUser> = {
      updatedAt: new Date(),
    };

    if (typeof body.fullName !== 'undefined') {
      const fullName = sanitizeInput(body.fullName).trim();
      if (!fullName) {
        throw new HttpErrors.UnprocessableEntity('Full name is required');
      }
      updatePayload.fullName = fullName;
    }

    if (typeof body.email !== 'undefined') {
      const email = validateAndSanitizeEmail(body.email);

      if (email !== existingUser.email) {
        const duplicateEmailUser = await this.usersRepository.findOne({
          where: {
            and: [
              {email},
              {id: {neq: currentUser.id}},
              {isDeleted: false},
            ],
          },
        });

        if (duplicateEmailUser) {
          throw new HttpErrors.BadRequest('User already exists with this email');
        }
      }

      updatePayload.email = email;
    }

    if (typeof body.phone !== 'undefined') {
      const phone = validateAndSanitizeMobile(body.phone);

      if (phone !== existingUser.phone) {
        const duplicatePhoneUser = await this.usersRepository.findOne({
          where: {
            and: [
              {phone},
              {id: {neq: currentUser.id}},
              {isDeleted: false},
            ],
          },
        });

        if (duplicatePhoneUser) {
          throw new HttpErrors.BadRequest('User already exists with this phone');
        }
      }

      updatePayload.phone = phone;
    }

    await this.usersRepository.updateById(currentUser.id, updatePayload);

    return this.whoAmI(currentUser);
  }

  // -----------------------------------------registration verification Otp's---------------------------
  @post('/api/auth/send-phone-otp')
  async sendPhoneOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['phone', 'role'],
            properties: {
              phone: {type: 'string'},
              role: {type: 'string'}
            }
          }
        }
      }
    })
    body: {
      phone: string;
      role: string;
    }
  ): Promise<{success: boolean; message: string; sessionId: string}> {
    // Validate and sanitize mobile number
    const sanitizedPhone = validateAndSanitizeMobile(body.phone);

    // Rate limiting: 3 OTP requests per hour per phone number
    this.rateLimiterService.checkOtpRequest(sanitizedPhone);

    const user = await this.usersRepository.findOne({
      where: {phone: sanitizedPhone}
    });

    const role = await this.rolesRepository.findOne({
      where: {value: body.role}
    });

    if (!role) {
      if (process.env.NODE_ENV === 'dev') {
        throw new HttpErrors.BadRequest("Invalid role received");
      }
      throw new HttpErrors.InternalServerError("Something went wrong");
    }

    if (user) {
      const isUserRole = await this.userRolesRepository.findOne({
        where: {usersId: user.id, rolesId: role.id}
      });

      if (isUserRole) {
        throw new HttpErrors.BadRequest(
          `Phone number is already registered as ${role.label}`
        );
      }
    }

    const {record: otp, code: otpCode} = await this.otpService.issue({
      identifier: sanitizedPhone,
      identifierType: OtpIdentifierType.PHONE,
      purpose: OtpPurpose.SIGNUP_PHONE,
    });

    // Deliver phone verification through the configured WhatsApp provider.
    try {
      const providerMessageId = await this.otpNotificationService.sendOtp({
        channel: 'whatsapp', identifier: sanitizedPhone, code: otpCode, purpose: OtpPurpose.SIGNUP_PHONE,
      });
      if (providerMessageId) await this.otpService.recordProviderMessage(otp.id, providerMessageId);
    } catch (error) {
      console.error('Failed to send SMS OTP:', error);
      await this.otpService.invalidate(otp.id);
      await this.otpService.releaseIssueCooldown(OtpPurpose.SIGNUP_PHONE, sanitizedPhone);
      throw new HttpErrors.ServiceUnavailable('Failed to send OTP. Please try again.');
    }

    const existingSession = await this.registrationSessionsRepository.findOne({
      where: {
        and: [
          {phoneNumber: sanitizedPhone},
          {roleValue: body.role},
          {isActive: true},
          {isDeleted: false}
        ]
      }
    });

    if (existingSession) {
      await this.registrationSessionsRepository.updateById(existingSession.id, {
        phoneVerified: false,
        emailVerified: false,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      });

      return {
        success: true,
        message: "OTP sent successfully",
        sessionId: existingSession.id,
      };
    }

    const session = await this.registrationSessionsRepository.create({
      phoneNumber: sanitizedPhone,
      phoneVerified: false,
      emailVerified: false,
      roleValue: body.role,
      isActive: true,
      isDeleted: false,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
    });

    if (!session) {
      throw new HttpErrors.InternalServerError(
        process.env.NODE_ENV === 'dev'
          ? "Failed to create registration session"
          : "Something went wrong"
      );
    }

    return {
      success: true,
      message: "OTP sent successfully",
      sessionId: session.id,
    };
  }

  @post('/api/auth/verify-phone-otp')
  async verifyPhoneOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'otp'],
            properties: {
              sessionId: {type: 'string'},
              otp: {type: 'string'},
            },
          },
        },
      },
    })
    body: {sessionId: string; otp: string},
  ): Promise<{success: boolean; message: string}> {
    const {sessionId, otp} = body;

    const session = await this.registrationSessionsRepository.findById(
      sessionId,
    );

    if (!session) {
      throw new HttpErrors.BadRequest('Invalid session');
    }

    if (!session.isActive || new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired, please restart signup');
    }

    if (!session.phoneNumber) {
      throw new HttpErrors.BadRequest('Phone number missing in session');
    }

    const otpEntry = await this.otpRepository.findOne({where: {
      identifier: session.phoneNumber, purpose: OtpPurpose.SIGNUP_PHONE, isUsed: false,
    }, order: ['createdAt DESC']});
    if (!otpEntry) throw new HttpErrors.BadRequest('OTP expired or not found');
    await this.otpService.verifyAndConsume(
      otpEntry.id, session.phoneNumber, OtpIdentifierType.PHONE, OtpPurpose.SIGNUP_PHONE, otp,
    );

    await this.registrationSessionsRepository.updateById(sessionId, {
      phoneVerified: true,
    });

    return {
      success: true,
      message: 'Phone number verified successfully',
    };
  }

  @post('/api/auth/user/register')
  async registerUser(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'fullName', 'password'],
            properties: {
              sessionId: {type: 'string'},
              fullName: {type: 'string'},
              email: {type: 'string'},
              password: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      sessionId: string;
      fullName: string;
      email?: string;
      password: string;
    },
  ): Promise<{success: boolean; message: string; accessToken: string; user: any}> {
    const {sessionId, fullName, email, password} = body;

    // Verify session exists and is verified
    const session = await this.registrationSessionsRepository.findById(sessionId);

    if (!session) {
      throw new HttpErrors.BadRequest('Invalid session');
    }

    if (!session.phoneVerified) {
      throw new HttpErrors.BadRequest('Phone number not verified');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired');
    }

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: {phone: session.phoneNumber},
    });

    if (existingUser) {
      throw new HttpErrors.BadRequest('User already exists with this phone number');
    }

    // Get user role
    const userRole = await this.rolesRepository.findOne({
      where: {value: session.roleValue},
    });

    if (!userRole) {
      throw new HttpErrors.BadRequest('Invalid role');
    }

    // Hash password
    const hashedPassword = await this.hasher.hashPassword(password);

    // Create user
    const newUser = await this.usersRepository.create({
      fullName,
      email: email || undefined,
      phone: session.phoneNumber,
      password: hashedPassword,
      isActive: true,
    });

    // Assign role to user
    await this.userRolesRepository.create({
      usersId: newUser.id!,
      rolesId: userRole.id!,
    });

    // Mark session as used
    await this.registrationSessionsRepository.updateById(sessionId, {
      isActive: false,
    });

    // Get user roles and permissions using RBAC service
    const {roles, permissions} = await this.rbacService.getUserRolesAndPermissions(newUser.id!);

    // Generate JWT token with roles and permissions
    const userProfile = {
      [securityId]: newUser.id,
      id: newUser.id,
      email: newUser.email,
      phoneNumber: newUser.phone,
      phone: newUser.phone,
      fullName: newUser.fullName,
      roles,
      permissions,
    };

    const token = await this.jwtService.generateToken(userProfile);

    return {
      success: true,
      message: 'Registration successful',
      accessToken: token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        roles,
        permissions,
      },
    };
  }

  @post('/api/auth/user/login')
  async userLogin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['identifier', 'password'],
            properties: {
              identifier: {type: 'string', description: 'Email or phone number'},
              password: {type: 'string'},
              rememberMe: {type: 'boolean'},
            },
          },
        },
      },
    })
    body: {identifier: string; password: string; rememberMe?: boolean},
  ): Promise<{success: boolean; message: string; accessToken: string; user: object}> {
    // Rate limiting: 5 login attempts per 15 minutes per IP
    const clientIp = this.getClientIp();
    this.rateLimiterService.checkLoginAttempt(clientIp);

    const {identifier, password} = body;

    // Check if identifier is email or phone
    const isEmail = identifier.includes('@');

    const userData = await this.usersRepository.findOne({
      where: {
        and: [
          isEmail ? {email: identifier} : {phone: identifier},
          {isDeleted: false},
        ],
      },
    });

    if (!userData) {
      throw new HttpErrors.BadRequest('Invalid credentials');
    }

    if (!userData.isActive) {
      throw new HttpErrors.Forbidden('Your account has been blocked. Please contact support.');
    }

    // Verify password
    const passwordMatched = await this.hasher.comparePassword(password, userData.password!);

    if (!passwordMatched) {
      throw new HttpErrors.BadRequest('Invalid credentials');
    }

    // Get user roles
    const {roles, permissions} = await this.rbacService.getUserRolesAndPermissions(userData.id!);

    // Reset login attempts on successful login
    this.rateLimiterService.resetLoginAttempts(clientIp);

    const userProfile: UserProfile & {
      roles: string[];
      permissions: string[];
      phoneNumber: string;
      fullName: string;
    } = {
      [securityId]: userData.id!,
      id: userData.id!,
      email: userData.email,
      phoneNumber: userData.phone || '',
      fullName: userData.fullName || '',
      roles,
      permissions,
    };

    const token = await this.jwtService.generateToken(userProfile);

    // Parse device info from user-agent
    const userAgent = this.request.headers['user-agent'] || 'Unknown';
    const deviceInfo = parseDeviceInfo(userAgent);
    const formattedDeviceInfo = formatDeviceInfo(deviceInfo);

    // Create refresh token (optional - won't break login if it fails)
    try {
      const refreshToken = crypto.randomBytes(32).toString('hex');
      await this.refreshTokenRepository.create({
        id: uuidv4(),
        userId: userData.id,
        token: refreshToken,
        deviceInfo: formattedDeviceInfo,
        ipAddress: this.getClientIp(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isRevoked: false,
      });

      // Set refresh token as httpOnly cookie
      this.request.res?.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    } catch (refreshTokenError) {
      console.error('Failed to create refresh token:', refreshTokenError);
      // Continue with login even if refresh token creation fails
    }

    return {
      success: true,
      message: 'Login successful',
      accessToken: token,
      user: {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        roles,
        permissions,
      },
    };
  }

  @post('/api/auth/check-user')
  async checkUser(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['identifier'],
            properties: {
              identifier: {
                type: 'object',
                properties: {
                  email: {type: 'string'},
                  phone: {type: 'string'},
                },
              },
            },
          },
        },
      },
    })
    body: {identifier: {email?: string; phone?: string}},
  ): Promise<{exists: boolean; userId?: string}> {
    const {email, phone} = body.identifier;

    const user = await this.usersRepository.findOne({
      where: email ? {email} : {phone},
    });

    return {
      exists: !!user,
      userId: user?.id,
    };
  }

  @post('/api/auth/user/otp-login')
  async userOtpLogin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'identifier'],
            properties: {
              sessionId: {type: 'string'},
              identifier: {type: 'string'},
            },
          },
        },
      },
    })
    body: {sessionId: string; identifier: string},
  ): Promise<{success: boolean; message: string; accessToken: string; user: object}> {
    const {sessionId, identifier} = body;

    // Verify session
    const session = await this.registrationSessionsRepository.findById(sessionId);

    if (!session) {
      throw new HttpErrors.BadRequest('Invalid session');
    }

    if (!session.isActive || new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired');
    }

    if (!session.phoneVerified && !session.emailVerified) {
      throw new HttpErrors.BadRequest('OTP not verified');
    }

    // Bind login identity to the identifier that was actually verified.
    const isEmail = identifier.includes('@');
    const canonicalIdentifier = isEmail
      ? validateAndSanitizeEmail(identifier)
      : validateAndSanitizeMobile(identifier);
    const verifiedIdentifier = isEmail ? session.email : session.phoneNumber;
    if (!verifiedIdentifier || verifiedIdentifier !== canonicalIdentifier) {
      throw new HttpErrors.BadRequest('Verified identity does not match login identity');
    }
    const userData = await this.usersRepository.findOne({
      where: isEmail ? {email: canonicalIdentifier} : {phone: canonicalIdentifier},
    });

    if (!userData) {
      throw new HttpErrors.BadRequest('User not found');
    }

    // Get user roles
    const {roles, permissions} = await this.rbacService.getUserRolesAndPermissions(userData.id!);

    const userProfile: UserProfile & {
      roles: string[];
      permissions: string[];
      phoneNumber: string;
      fullName: string;
    } = {
      [securityId]: userData.id!,
      id: userData.id!,
      email: userData.email,
      phoneNumber: userData.phone || '',
      fullName: userData.fullName || '',
      roles,
      permissions,
    };

    const token = await this.jwtService.generateToken(userProfile);

    // Mark session as used
    await this.registrationSessionsRepository.updateById(sessionId, {
      isActive: false,
    });

    return {
      success: true,
      message: 'Login successful',
      accessToken: token,
      user: {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        roles,
        permissions,
      },
    };
  }

  @post('/api/auth/send-email-otp')
  async sendEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'email'],
            properties: {
              sessionId: {type: 'string'},
              email: {type: 'string'},
            }
          }
        }
      }
    })
    body: {
      sessionId: string;
      email: string;
    }
  ): Promise<{success: boolean; message: string}> {
    // Validate and sanitize email
    const sanitizedEmail = validateAndSanitizeEmail(body.email);

    // Rate limiting: 3 OTP requests per hour per email
    this.rateLimiterService.checkOtpRequest(sanitizedEmail);

    const session = await this.registrationSessionsRepository.findById(
      body.sessionId,
    );

    if (!session) {
      throw new HttpErrors.BadRequest('Invalid session');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired, please restart signup');
    }

    if (!session.phoneVerified) {
      throw new HttpErrors.BadRequest('Phone number is not verified');
    }

    const user = await this.usersRepository.findOne({
      where: {email: sanitizedEmail}
    });

    const role = await this.rolesRepository.findOne({
      where: {value: session.roleValue}
    });

    if (!role) {
      if (process.env.NODE_ENV === 'dev') {
        throw new HttpErrors.BadRequest("Invalid role received");
      }
      throw new HttpErrors.InternalServerError("Something went wrong");
    }

    if (user) {
      if (session.phoneNumber !== user.phone) {
        throw new HttpErrors.BadRequest(
          `Email is already registered with another user`
        );
      }

      const isUserRole = await this.userRolesRepository.findOne({
        where: {usersId: user.id, rolesId: role.id}
      });

      if (isUserRole) {
        throw new HttpErrors.BadRequest(
          `Email is already registered as ${role.label}`
        );
      }

    }

    const existingPhoneUser = await this.usersRepository.findOne({
      where: {
        and: [
          {phone: session.phoneNumber},
          {isActive: true},
          {isDeleted: false}
        ]
      }
    });

    if (existingPhoneUser && (existingPhoneUser.email !== sanitizedEmail)) {
      throw new HttpErrors.BadRequest(
        `Phone is already registered with another email`
      );
    }

    const {record: otp, code: otpCode} = await this.otpService.issue({
      identifier: sanitizedEmail,
      identifierType: OtpIdentifierType.EMAIL,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
    });

    // Send OTP via Email
    try {
      await this.otpNotificationService.sendOtp({channel: 'email', identifier: sanitizedEmail, code: otpCode, purpose: OtpPurpose.EMAIL_VERIFICATION});
    } catch (error) {
      console.error('Failed to send email OTP:', error);
      await this.otpService.invalidate(otp.id);
      await this.otpService.releaseIssueCooldown(OtpPurpose.EMAIL_VERIFICATION, sanitizedEmail);
      throw new HttpErrors.InternalServerError('Failed to send OTP email. Please try again.');
    }

    await this.registrationSessionsRepository.updateById(body.sessionId, {
      email: sanitizedEmail,
      emailVerified: false,
    });

    return {
      success: true,
      message: "OTP sent successfully",
    };
  }

  @post('/api/auth/verify-email-otp')
  async verifyEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'otp'],
            properties: {
              sessionId: {type: 'string'},
              otp: {type: 'string'},
            },
          },
        },
      },
    })
    body: {sessionId: string; otp: string; isAlreadyRegistered: boolean},
  ): Promise<{success: boolean; message: string}> {
    const {sessionId, otp} = body;

    const session = await this.registrationSessionsRepository.findById(
      sessionId,
    );

    if (!session) {
      throw new HttpErrors.BadRequest('Invalid session');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired, please restart signup');
    }

    if (!session.email) {
      throw new HttpErrors.BadRequest('Email missing in session');
    }

    const otpEntry = await this.otpRepository.findOne({where: {
      identifier: session.email, purpose: OtpPurpose.EMAIL_VERIFICATION, isUsed: false,
    }, order: ['createdAt DESC']});
    if (!otpEntry) throw new HttpErrors.BadRequest('OTP expired or not found');
    await this.otpService.verifyAndConsume(
      otpEntry.id, session.email, OtpIdentifierType.EMAIL, OtpPurpose.EMAIL_VERIFICATION, otp,
    );

    await this.registrationSessionsRepository.updateById(sessionId, {
      emailVerified: true,
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  // -----------------------------------------registration verification Otp's---------------------------
  @post('/api/auth/forget-password/send-email-otp')
  async sendForgetPasswordEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: {type: 'string'},
              role: {type: 'string'},
            }
          }
        }
      }
    })
    body: {
      email: string;
      role?: string;
    }
  ): Promise<{success: boolean; message: string}> {
    // Validate and sanitize email
    const sanitizedEmail = validateAndSanitizeEmail(body.email);

    // Rate limiting: 3 password reset requests per hour per email
    this.rateLimiterService.checkPasswordResetRequest(sanitizedEmail);

    const user = await this.usersRepository.findOne({
      where: {
        and: [
          {email: sanitizedEmail},
          {isDeleted: false}
        ]
      }
    });

    if (!user) {
      throw new HttpErrors.NotFound("User doesn't exist");
    }

    if (user && !user.isActive) {
      throw new HttpErrors.BadRequest("User is not active");
    }

    // `role` is optional: the admin panel no longer knows the login type up
    // front, so fall back to whatever panel role the account holds.
    const roleValue = body.role ?? (await this.resolvePanelRole(user.id!));

    if (!roleValue) {
      throw new HttpErrors.Unauthorized('Unauthorized access');
    }

    const role = await this.rolesRepository.findOne({
      where: {value: roleValue}
    });

    if (!role) {
      throw new HttpErrors.BadRequest('Role not found');
    }

    const isUserRole = await this.userRolesRepository.findOne({
      where: {usersId: user.id, rolesId: role.id}
    });

    if (!isUserRole) {
      throw new HttpErrors.Unauthorized('Unauthorized access');
    }

    const {record: otp, code: otpCode} = await this.otpService.issue({
      identifier: sanitizedEmail,
      identifierType: OtpIdentifierType.EMAIL,
      purpose: OtpPurpose.PASSWORD_RESET,
      userId: user.id,
    });

    // Send OTP via Email
    try {
      await this.otpNotificationService.sendOtp({channel: 'email', identifier: sanitizedEmail, code: otpCode, purpose: OtpPurpose.PASSWORD_RESET});
    } catch (error) {
      console.error('Failed to send password reset email OTP:', error);
      await this.otpService.invalidate(otp.id);
      await this.otpService.releaseIssueCooldown(OtpPurpose.PASSWORD_RESET, sanitizedEmail);
      throw new HttpErrors.InternalServerError('Failed to send OTP email. Please try again.');
    }

    return {
      success: true,
      message: "OTP sent successfully",
    };
  }

  @post('/api/auth/forget-password/verify-email-otp')
  async verifyForgetPasswordEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'otp', 'newPassword'],
            properties: {
              email: {type: 'string'},
              otp: {type: 'string'},
              role: {type: 'string'},
              newPassword: {type: 'string'},
            }
          }
        }
      }
    })
    body: {
      email: string;
      otp: string;
      role?: string;
      newPassword: string;
    }
  ): Promise<{success: boolean; message: string}> {
    // Validate and sanitize email
    const sanitizedEmail = validateAndSanitizeEmail(body.email);

    // Validate password strength
    validateAndCheckPassword(body.newPassword);

    const user = await this.usersRepository.findOne({
      where: {
        and: [
          {email: sanitizedEmail},
          {isDeleted: false}
        ]
      }
    });

    if (!user) {
      throw new HttpErrors.NotFound("User doesn't exist");
    }

    if (user && !user.isActive) {
      throw new HttpErrors.BadRequest("User is not active");
    }

    const roleValue = body.role ?? (await this.resolvePanelRole(user.id!));

    if (!roleValue) {
      throw new HttpErrors.Unauthorized('Unauthorized access');
    }

    const role = await this.rolesRepository.findOne({
      where: {value: roleValue}
    });

    if (!role) {
      throw new HttpErrors.BadRequest('Role not found');
    }

    const isUserRole = await this.userRolesRepository.findOne({
      where: {usersId: user.id, rolesId: role.id}
    });

    if (!isUserRole) {
      throw new HttpErrors.Unauthorized('Unauthorized access');
    }

    const otpEntry = await this.otpRepository.findOne({where: {
      identifier: sanitizedEmail, purpose: OtpPurpose.PASSWORD_RESET, isUsed: false,
    }, order: ['createdAt DESC']});
    if (!otpEntry) throw new HttpErrors.BadRequest('OTP expired or not found');
    await this.otpService.verifyAndConsume(
      otpEntry.id, sanitizedEmail, OtpIdentifierType.EMAIL, OtpPurpose.PASSWORD_RESET, body.otp,
    );

    const hashedPassword = await this.hasher.hashPassword(body.newPassword);

    await this.usersRepository.updateById(user.id, {password: hashedPassword});
    await this.revokeUserRefreshTokens(user.id);

    return {
      success: true,
      message: 'Password updated'
    }
  }

  // @post('/auth/investor-login/send-otp')
  // async investorLoginSendOtp(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: {
  //           type: 'object',
  //           required: ['email', 'rememberMe'],
  //           properties: {
  //             emailOrPhone: {type: 'string'},
  //             // password: {type: 'string'},
  //             rememberMe: {type: 'boolean'},
  //           }
  //         }
  //       }
  //     }
  //   })
  //   body: {emailOrPhone: string; rememberMe: boolean}
  // ): Promise<{success: boolean; message: string}> {
  //   const userData = await this.usersRepository.findOne({
  //     where: {
  //       and: [
  //         {
  //           or: [
  //             {email: body.emailOrPhone},
  //             {phone: body.emailOrPhone}
  //           ]
  //         },
  //         {isDeleted: false}
  //       ]
  //     }
  //   });

  //   if (!userData) {
  //     throw new HttpErrors.BadRequest('User not exist');
  //   }

  //   const isEmail = userData?.email === body.emailOrPhone;
  //   const investor = await this.investorProfileRepository.findOne({
  //     where: {
  //       and: [
  //         {usersId: userData.id},
  //         {isActive: true},
  //         {isDeleted: false}
  //       ]
  //     }
  //   });

  //   if (!investor) {
  //     throw new HttpErrors.Unauthorized('Unauthorized access');
  //   }

  //   const {roles} = await this.rbacService.getUserRoleAndPermissionsByRole(userData.id, 'investor');

  //   if (!roles.includes('investor')) {
  //     throw new HttpErrors.Forbidden('Access denied. Only investors can login here.');
  //   }

  //   // send otp to user...
  //   if (isEmail) {
  //     await this.otpRepository.updateAll(
  //       {isUsed: true, expiresAt: new Date()},
  //       {identifier: body.emailOrPhone, type: 1}
  //     );
  //   } else {
  //     await this.otpRepository.updateAll(
  //       {isUsed: true, expiresAt: new Date()},
  //       {identifier: body.emailOrPhone, type: 0}
  //     );
  //   }

  //   const otp = await this.otpRepository.create({
  //     otp: '123456',
  //     type: isEmail ? 1 : 0,
  //     identifier: body.emailOrPhone,
  //     attempts: 0,
  //     isUsed: false,
  //     expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
  //   });

  //   if (!otp) {
  //     throw new HttpErrors.InternalServerError(
  //       process.env.NODE_ENV === 'dev'
  //         ? "Failed to create otp"
  //         : "Something went wrong"
  //     );
  //   }

  //   return {
  //     success: true,
  //     message: "OTP send successfully",
  //   };
  // }

  // @post('/auth/investor-login/verify-otp')
  // async investorLoginVerifyOtp(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: {
  //           type: 'object',
  //           required: ['email', 'otp', 'rememberMe'],
  //           properties: {
  //             emailOrPhone: {type: 'string'},
  //             otp: {type: 'string'},
  //             // password: {type: 'string'},
  //             rememberMe: {type: 'boolean'},
  //           }
  //         }
  //       }
  //     }
  //   })
  //   body: {emailOrPhone: string; otp: string; rememberMe: boolean}
  // ): Promise<{success: boolean; message: string; accessToken: string; user: object}> {
  //   const userData = await this.usersRepository.findOne({
  //     where: {
  //       and: [
  //         {
  //           or: [
  //             {email: body.emailOrPhone},
  //             {phone: body.emailOrPhone}
  //           ]
  //         },
  //         {isDeleted: false}
  //       ]
  //     }
  //   });

  //   if (!userData) {
  //     throw new HttpErrors.BadRequest('User not exist');
  //   }

  //   const isEmail = userData?.email === body.emailOrPhone;
  //   const investor = await this.investorProfileRepository.findOne({
  //     where: {
  //       and: [
  //         {usersId: userData.id},
  //         {isActive: true},
  //         {isDeleted: false}
  //       ]
  //     }
  //   });

  //   if (!investor) {
  //     throw new HttpErrors.Unauthorized('Unauthorized access');
  //   }

  //   const otpEntry = await this.otpRepository.findOne({
  //     where: {
  //       identifier: body.emailOrPhone,
  //       type: isEmail ? 1 : 0,
  //       isUsed: false,
  //     },
  //     order: ['createdAt DESC'],
  //   });

  //   if (!otpEntry) {
  //     throw new HttpErrors.BadRequest('OTP expired or not found');
  //   }

  //   if (otpEntry.attempts >= 3) {
  //     throw new HttpErrors.BadRequest(
  //       'Maximum attempts reached, please request a new OTP',
  //     );
  //   }

  //   if (new Date(otpEntry.expiresAt) < new Date()) {
  //     await this.otpRepository.updateById(otpEntry.id, {
  //       isUsed: true,
  //       expiresAt: new Date(),
  //     });

  //     throw new HttpErrors.BadRequest('OTP expired, request a new one');
  //   }

  //   if (otpEntry.otp !== body.otp) {
  //     await this.otpRepository.updateById(otpEntry.id, {
  //       attempts: otpEntry.attempts + 1,
  //     });

  //     throw new HttpErrors.BadRequest('Invalid OTP');
  //   }

  //   await this.otpRepository.updateById(otpEntry.id, {
  //     isUsed: true,
  //     expiresAt: new Date(),
  //   });


  //   const {roles, permissions} = await this.rbacService.getUserRoleAndPermissionsByRole(userData.id!, 'investor');

  //   if (!roles.includes('investor')) {
  //     throw new HttpErrors.Forbidden('Access denied. Only Investors can login here.');
  //   }

  //   const userProfile: UserProfile & {
  //     roles: string[];
  //     permissions: string[];
  //     phone: string;
  //   } = {
  //     [securityId]: userData.id!,
  //     id: userData.id!,
  //     email: userData.email,
  //     phone: userData.phone,
  //     roles,
  //     permissions,
  //   };

  //   const token = await this.jwtService.generateToken(userProfile);
  //   const profile = await this.rbacService.returnInvestorProfile(userData.id, roles, permissions);

  //   return {
  //     success: true,
  //     message: "Investor login successful",
  //     accessToken: token,
  //     user: profile
  //   };
  // }

  // ---------------------------------------Google OAuth API's----------------------------------------
  @get('/api/auth/google', {
    responses: {
      '302': {
        description: 'Redirect to Google OAuth',
      },
    },
  })
  async googleAuth(): Promise<void> {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in cache with 10-minute expiration
    await this.cacheService.set(`oauth:state:${state}`, true, 600); // 10 minutes TTL

    const authUrl = this.googleOAuthService.getAuthorizationUrl(state);

    // Redirect to Google OAuth
    this.request.res?.redirect(authUrl);
  }

  @get('/api/auth/google/callback', {
    responses: {
      '302': {
        description: 'Redirect to frontend with token',
      },
    },
  })
  async googleCallback(
    @param.query.string('code') code: string,
    @param.query.string('state') state: string,
  ): Promise<void> {
    if (!code) {
      // Redirect to frontend with error
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      this.request.res?.redirect(`${frontendUrl}/auth/google/callback?error=no_code`);
      return;
    }

    // Validate state parameter for CSRF protection
    if (!state) {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      this.request.res?.redirect(`${frontendUrl}/auth/google/callback?error=invalid_state`);
      return;
    }

    const storedState = await this.cacheService.get<boolean>(`oauth:state:${state}`);
    if (!storedState) {
      console.error(`Invalid state. Received: ${state}`);
      // If we are in development mode, we might want to be more lenient if Redis is down
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
      if (!isDev) {
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        this.request.res?.redirect(`${frontendUrl}/auth/google/callback?error=invalid_state`);
        return;
      }
      console.warn('Development mode: allowing login despite invalid state');
    }

    // Delete state after validation (one-time use)
    if (storedState) {
      await this.cacheService.delete(`oauth:state:${state}`);
    }

    try {
      // Exchange code for access token
      const accessToken = await this.googleOAuthService.getAccessToken(code);

      // Get user info from Google
      const googleUser = await this.googleOAuthService.getUserInfo(accessToken);

      // Find or create user
      const user = await this.googleOAuthService.findOrCreateUser(googleUser);

      if (!user.isActive) {
        throw new HttpErrors.Forbidden('Your account has been blocked. Please contact support.');
      }

      // Generate JWT token
      const token = await this.googleOAuthService.generateToken(
        user,
        this.jwtService,
        this.rbacService,
      );

      // Parse device info from user-agent
      const userAgent = this.request.headers['user-agent'] || 'Unknown';
      const deviceInfo = parseDeviceInfo(userAgent);
      const formattedDeviceInfo = formatDeviceInfo(deviceInfo);

      // Create refresh token (optional - won't break login if it fails)
      try {
        const refreshToken = crypto.randomBytes(32).toString('hex');
        await this.refreshTokenRepository.create({
          id: uuidv4(),
          userId: user.id,
          token: refreshToken,
          deviceInfo: formattedDeviceInfo,
          ipAddress: this.getClientIp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isRevoked: false,
        });

        // Set refresh token as httpOnly cookie
        this.request.res?.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      } catch (refreshTokenError) {
        console.error('Failed to create refresh token:', refreshTokenError);
        // Continue with login even if refresh token creation fails
      }

      // Redirect to frontend with token
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      this.request.res?.redirect(
        `${frontendUrl}/auth/google/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          profilePicture: user.profilePicture,
          authProvider: user.authProvider,
        }))}`
      );
    } catch (error) {
      console.error('Google OAuth error:', error);
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      this.request.res?.redirect(`${frontendUrl}/auth/google/callback?error=auth_failed`);
    }
  }

  // ---------------------------------------User Profile Management API's----------------------------------------
  @authenticate('jwt')
  @authorize({roles: ['user']})
  @get('/api/users/profile')
  async getUserProfile(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
  ): Promise<object> {
    return this.userProfileService.getUserProfile(currentUser.id);
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @patch('/api/users/profile')
  async updateProfile(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fullName: {type: 'string'},
              address: {type: 'string'},
              city: {type: 'string'},
              state: {type: 'string'},
              country: {type: 'string'},
              zipCode: {type: 'string'},
            },
          },
        },
      },
    })
    data: {
      fullName?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    },
  ): Promise<object> {
    // Sanitize all text inputs to prevent XSS
    const sanitizedData = {
      fullName: data.fullName ? sanitizeInput(data.fullName) : undefined,
      address: data.address ? sanitizeInput(data.address) : undefined,
      city: data.city ? sanitizeInput(data.city) : undefined,
      state: data.state ? sanitizeInput(data.state) : undefined,
      country: data.country ? sanitizeInput(data.country) : undefined,
      zipCode: data.zipCode ? sanitizeInput(data.zipCode) : undefined,
    };

    return this.userProfileService.updateProfile(currentUser.id, sanitizedData);
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @patch('/api/users/profile/avatar')
  async updateAvatar(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<{success: boolean; message: string; avatarUrl?: string}> {
    return new Promise((resolve, reject) => {
      this.handler(request, response, async (err: any) => {
        if (err) {
          reject(new HttpErrors.InternalServerError('Avatar upload failed'));
        } else {
          try {
            const result = await this.userProfileService.updateAvatar(currentUser.id, request);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @post('/api/users/profile/email/send-otp')
  async sendEmailUpdateOtp(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['newEmail'],
            properties: {
              newEmail: {type: 'string'},
            },
          },
        },
      },
    })
    body: {newEmail: string},
  ): Promise<{success: boolean; message: string; otpId?: string}> {
    return this.userProfileService.initiateEmailUpdate(
      currentUser.id,
      body.newEmail,
      this.hasher,
    );
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @patch('/api/users/profile/email')
  async updateEmail(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['newEmail', 'otp'],
            properties: {
              newEmail: {type: 'string'},
              otp: {type: 'string'},
            },
          },
        },
      },
    })
    body: {newEmail: string; otp: string},
  ): Promise<{success: boolean; message: string}> {
    return this.userProfileService.verifyAndUpdateEmail(
      currentUser.id,
      body.newEmail,
      body.otp,
      this.hasher,
    );
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @post('/api/users/profile/mobile/send-otp')
  async sendMobileUpdateOtp(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['newMobile'],
            properties: {
              newMobile: {type: 'string'},
            },
          },
        },
      },
    })
    body: {newMobile: string},
  ): Promise<{success: boolean; message: string; otpId?: string}> {
    return this.userProfileService.initiateMobileUpdate(
      currentUser.id,
      body.newMobile,
      this.hasher,
    );
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @patch('/api/users/profile/mobile')
  async updateMobile(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['newMobile', 'otp'],
            properties: {
              newMobile: {type: 'string'},
              otp: {type: 'string'},
            },
          },
        },
      },
    })
    body: {newMobile: string; otp: string},
  ): Promise<{success: boolean; message: string}> {
    return this.userProfileService.verifyAndUpdateMobile(
      currentUser.id,
      body.newMobile,
      body.otp,
      this.hasher,
    );
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @del('/api/users/account')
  async deleteAccount(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
  ): Promise<{success: boolean; message: string}> {
    return this.userProfileService.deleteAccount(currentUser.id);
  }

  // ========================================
  // OTP-Based Login (Unified)
  // ========================================

  @post('/api/auth/send-otp-login')
  async sendOtpLogin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['identifier'],
            properties: {
              identifier: {type: 'string'},
            },
          },
        },
      },
    })
    request: {identifier: string},
  ): Promise<{success: boolean; message: string; otpId: string; expiresIn: number; resendAfter: number}> {
    try {
      const identifier = validateAndSanitizeMobile(request.identifier);
      const clientIp = this.getClientIp();
      await this.otpService.enforceLoginSendLimits(identifier, clientIp);
      const {record, code} = await this.otpService.issue({
        identifier,
        identifierType: OtpIdentifierType.PHONE,
        purpose: OtpPurpose.LOGIN_PHONE,
        ip: clientIp,
      });

      try {
        const providerMessageId = await this.otpNotificationService.sendOtp({
          channel: 'whatsapp', identifier, code, purpose: OtpPurpose.LOGIN_PHONE,
        });
        if (providerMessageId) await this.otpService.recordProviderMessage(record.id, providerMessageId);
      } catch (providerError) {
        await this.otpService.invalidate(record.id);
        await this.otpService.releaseIssueCooldown(OtpPurpose.LOGIN_PHONE, identifier);
        throw new HttpErrors.ServiceUnavailable('Unable to send verification code. Please try again later.');
      }

      return {
        success: true,
        message: 'Verification code sent',
        otpId: record.id!,
        expiresIn: OTP_CONFIG.expirySeconds,
        resendAfter: OTP_CONFIG.resendCooldownSeconds,
      };
    } catch (error) {
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      console.error('Failed to issue login OTP:', {name: error?.name});
      throw new HttpErrors.InternalServerError('Unable to send verification code.');
    }
  }

  @post('/api/auth/verify-otp-login')
  async verifyOtpLogin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['otpId', 'otp', 'identifier'],
            properties: {
              otpId: {type: 'string'},
              otp: {type: 'string'},
              identifier: {type: 'string'},
            },
          },
        },
      },
    })
    request: {otpId: string; otp: string; identifier: string},
  ): Promise<{
    success: boolean;
    accessToken: string;
    user: any;
    isNewUser: boolean;
  }> {
    try {
      const {otpId, otp, identifier} = request;

      const canonicalIdentifier = validateAndSanitizeMobile(identifier);
      await this.otpService.enforceLoginVerifyLimits(canonicalIdentifier, this.getClientIp());
      await this.otpService.verifyAndConsume(
        otpId, canonicalIdentifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, otp,
      );

      // Find or create user
      const whereClause = {phone: canonicalIdentifier};
      let user = await this.usersRepository.findOne({where: whereClause});
      let isNewUser = false;

      if (user && !user.isActive) {
        throw new HttpErrors.Forbidden('Your account has been blocked. Please contact support.');
      }

      if (!user) {
        // Auto-create user for e-commerce flow
        isNewUser = true;

        // Get or create 'user' role
        let userRole = await this.rolesRepository.findOne({where: {value: 'user'}});
        if (!userRole) {
          userRole = await this.rolesRepository.create({
            id: uuidv4(),
            label: 'User',
            value: 'user',
            description: 'Regular user role',
            isActive: true,
          });
        }

        // Create new user with minimal information
        const newUserData: any = {
          id: uuidv4(),
          password: await this.hasher.hashPassword(crypto.randomBytes(32).toString('hex')), // Random password
          isActive: true,
          isDeleted: false,
          authProvider: 'otp',
        };

        newUserData.phone = canonicalIdentifier;
        newUserData.email = '';
        newUserData.fullName = `User ${canonicalIdentifier.slice(-4)}`;
        newUserData.isEmailVerified = false;
        newUserData.isMobileVerified = true;

        user = await this.usersRepository.create(newUserData);

        // Assign user role
        await this.userRolesRepository.create({
          id: uuidv4(),
          usersId: user.id,
          rolesId: userRole.id,
          isActive: true,
        });
      }

      // Get user roles and permissions using RBAC service BEFORE generating token
      const {roles, permissions} = await this.rbacService.getUserRolesAndPermissions(user.id!);

      // Generate tokens with roles and permissions included
      const userProfile = this.userService.convertToUserProfile(user, roles, permissions);
      const accessToken = await this.jwtService.generateToken(userProfile);
      const refreshToken = crypto.randomBytes(32).toString('hex');

      // Store refresh token
      await this.refreshTokenRepository.create({
        id: uuidv4(),
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        deviceInfo: 'OTP Login',
      });

      this.request.res?.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          roles,
          permissions,
        },
        isNewUser,
      };
    } catch (error) {
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      console.error('Failed to complete OTP authentication:', {name: error?.name});
      throw new HttpErrors.InternalServerError('Unable to complete authentication.');
    }
  }
}



