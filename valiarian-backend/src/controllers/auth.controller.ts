import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import { get, HttpErrors, post, requestBody } from '@loopback/rest';
import { securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import { authorize } from '../authorization';
import { OtpRepository, RegistrationSessionsRepository, RolesRepository, UserRolesRepository, UsersRepository } from '../repositories';
import { BcryptHasher } from '../services/hash.password.bcrypt';
import { JWTService } from '../services/jwt-service';
import { MediaService } from '../services/media.service';
import { RbacService } from '../services/rbac.service';
import { MyUserService } from '../services/user-service';

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
    @inject('service.hasher')
    private hasher: BcryptHasher,
    @inject('service.user.service')
    public userService: MyUserService,
    @inject('service.jwt.service')
    public jwtService: JWTService,
    @inject('services.rbac')
    public rbacService: RbacService,
    @inject('service.media.service')
    private mediaService: MediaService
  ) { }

  // ---------------------------------------Super Admin Auth API's------------------------------------
  @post('/auth/super-admin')
  async createSuperAdmin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'phone', 'password', 'fullName'],
            properties: {
              email: { type: 'string' },
              phone: { type: 'string' },
              password: { type: 'string' },
              fullName: { type: 'string' },
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
  ): Promise<{ success: boolean; message: string; userId: string }> {
    const superadminRole = await this.rolesRepository.findOne({
      where: { value: 'super_admin' },
    });

    if (!superadminRole) {
      throw new HttpErrors.BadRequest(
        'Superadmin role does not exist in roles table',
      );
    }

    const existingSuperadmin = await this.userRolesRepository.findOne({
      where: { rolesId: superadminRole.id },
    });

    if (existingSuperadmin) {
      throw new HttpErrors.BadRequest('Super Admin already exists');
    }

    const existUser = await this.usersRepository.findOne({
      where: { email: body.email },
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

  @post('/auth/super-admin-login')
  async superAdminLogin(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password', 'rememberMe'],
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              rememberMe: { type: 'boolean' }
            }
          }
        }
      }
    })
    body: { email: string; password: string; rememberMe: boolean }
  ): Promise<{ success: boolean; message: string; accessToken: string; user: object }> {
    const userData = await this.usersRepository.findOne({
      where: {
        and: [
          { email: body.email },
          { isDeleted: false }
        ]
      }
    });

    if (!userData) {
      throw new HttpErrors.BadRequest('User not exist');
    }

    const user = await this.userService.verifyCredentials(body);

    const { roles, permissions } = await this.rbacService.getUserRoleAndPermissionsByRole(user.id!, 'super_admin');

    if (!roles.includes('super_admin')) {
      throw new HttpErrors.Forbidden('Access denied. Only super_admin can login here.');
    }

    const userProfile: UserProfile & {
      roles: string[];
      permissions: string[];
      phone: string;
    } = {
      [securityId]: user.id!,
      id: user.id!,
      email: user.email,
      phone: user.phone,
      roles,
      permissions,
    };

    const token = await this.jwtService.generateToken(userProfile);
    const profile = await this.rbacService.returnSuperAdminProfile(user.id, roles, permissions);
    return {
      success: true,
      message: "Super Admin login successful",
      accessToken: token,
      user: profile
    };
  }

  // --------------------------------------------Comman Auth API's-------------------------------------
  @authenticate('jwt')
  @authorize({ roles: ['super_admin'] })
  @post('/auth/update-password')
  async updatePassword(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['oldPassword', 'newPassword'],
            properties: {
              oldPassword: { type: 'string' },
              newPassword: { type: 'string' }
            }
          }
        }
      }
    })
    body: {
      oldPassword: string;
      newPassword: string;
    }
  ): Promise<{ success: boolean; message: string }> {
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

    await this.usersRepository.updateById(user.id, { password: hashedPassword });

    return {
      success: true,
      message: "Password updated successfully"
    }
  }

  @authenticate('jwt')
  @get('/auth/me')
  async whoAmI(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
  ): Promise<{}> {
    const user = await this.usersRepository.findOne({
      where: {
        id: currentUser.id,
      },
    });
    const userData = _.omit(user, 'password, fullName');
    return Promise.resolve({
      ...userData,
      roles: currentUser?.roles,
      permissions: currentUser?.permissions || []
    });
  }

  // -----------------------------------------registration verification Otp's---------------------------
  @post('/auth/send-phone-otp')
  async sendPhoneOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['phone', 'role'],
            properties: {
              phone: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      }
    })
    body: {
      phone: string;
      role: string;
    }
  ): Promise<{ success: boolean; message: string; sessionId: string }> {

    const user = await this.usersRepository.findOne({
      where: { phone: body.phone }
    });

    const role = await this.rolesRepository.findOne({
      where: { value: body.role }
    });

    if (!role) {
      if (process.env.NODE_ENV === 'dev') {
        throw new HttpErrors.BadRequest("Invalid role received");
      }
      throw new HttpErrors.InternalServerError("Something went wrong");
    }

    if (user) {
      const isUserRole = await this.userRolesRepository.findOne({
        where: { usersId: user.id, rolesId: role.id }
      });

      if (isUserRole) {
        throw new HttpErrors.BadRequest(
          `Phone number is already registered as ${role.label}`
        );
      }
    }

    await this.otpRepository.updateAll(
      { isUsed: true, expiresAt: new Date() },
      { identifier: body.phone, type: 0 }
    );

    const otp = await this.otpRepository.create({
      otp: '1234',
      type: 0,
      identifier: body.phone,
      attempts: 0,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
    });

    if (!otp) {
      throw new HttpErrors.InternalServerError(
        process.env.NODE_ENV === 'dev'
          ? "Failed to create otp"
          : "Something went wrong"
      );
    }

    const existingSession = await this.registrationSessionsRepository.findOne({
      where: {
        and: [
          { phoneNumber: body.phone },
          { roleValue: body.role },
          { isActive: true },
          { isDeleted: false }
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
      phoneNumber: body.phone,
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

  @post('/auth/verify-phone-otp')
  async verifyPhoneOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'otp'],
            properties: {
              sessionId: { type: 'string' },
              otp: { type: 'string' },
            },
          },
        },
      },
    })
    body: { sessionId: string; otp: string },
  ): Promise<{ success: boolean; message: string }> {
    const { sessionId, otp } = body;

    const session = await this.registrationSessionsRepository.findById(
      sessionId,
    );

    if (!session) {
      throw new HttpErrors.BadRequest('Invalid session');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new HttpErrors.BadRequest('Session expired, please restart signup');
    }

    if (!session.phoneNumber) {
      throw new HttpErrors.BadRequest('Phone number missing in session');
    }

    const otpEntry = await this.otpRepository.findOne({
      where: {
        identifier: session.phoneNumber,
        type: 0,
        isUsed: false,
      },
      order: ['createdAt DESC'],
    });

    if (!otpEntry) {
      throw new HttpErrors.BadRequest('OTP expired or not found');
    }

    if (otpEntry.attempts >= 3) {
      throw new HttpErrors.BadRequest(
        'Maximum attempts reached, please request a new OTP',
      );
    }

    if (new Date(otpEntry.expiresAt) < new Date()) {
      await this.otpRepository.updateById(otpEntry.id, {
        isUsed: true,
        expiresAt: new Date(),
      });

      throw new HttpErrors.BadRequest('OTP expired, request a new one');
    }

    if (otpEntry.otp !== otp) {
      await this.otpRepository.updateById(otpEntry.id, {
        attempts: otpEntry.attempts + 1,
      });

      throw new HttpErrors.BadRequest('Invalid OTP');
    }

    await this.otpRepository.updateById(otpEntry.id, {
      isUsed: true,
      expiresAt: new Date(),
    });

    await this.registrationSessionsRepository.updateById(sessionId, {
      phoneVerified: true,
    });

    return {
      success: true,
      message: 'Phone number verified successfully',
    };
  }

  @post('/auth/send-email-otp')
  async sendEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'email'],
            properties: {
              sessionId: { type: 'string' },
              email: { type: 'string' },
            }
          }
        }
      }
    })
    body: {
      sessionId: string;
      email: string;
    }
  ): Promise<{ success: boolean; message: string }> {

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
      where: { email: body.email }
    });

    const role = await this.rolesRepository.findOne({
      where: { value: session.roleValue }
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
        where: { usersId: user.id, rolesId: role.id }
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
          { phone: session.phoneNumber },
          { isActive: true },
          { isDeleted: false }
        ]
      }
    });

    if (existingPhoneUser && (existingPhoneUser.email !== body.email)) {
      throw new HttpErrors.BadRequest(
        `Phone is already registered with another email`
      );
    }

    await this.otpRepository.updateAll(
      { isUsed: true, expiresAt: new Date() },
      { identifier: body.email, type: 1 }
    );

    const otp = await this.otpRepository.create({
      otp: '4321',
      type: 1,
      identifier: body.email,
      attempts: 0,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
    });

    if (!otp) {
      throw new HttpErrors.InternalServerError(
        process.env.NODE_ENV === 'dev'
          ? "Failed to create otp"
          : "Something went wrong"
      );
    }

    await this.registrationSessionsRepository.updateById(body.sessionId, {
      email: body.email,
      emailVerified: false,
    });

    return {
      success: true,
      message: "OTP sent successfully",
    };
  }

  @post('/auth/verify-email-otp')
  async verifyEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'otp'],
            properties: {
              sessionId: { type: 'string' },
              otp: { type: 'string' },
            },
          },
        },
      },
    })
    body: { sessionId: string; otp: string; isAlreadyRegistered: boolean },
  ): Promise<{ success: boolean; message: string }> {
    const { sessionId, otp } = body;

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

    const otpEntry = await this.otpRepository.findOne({
      where: {
        identifier: session.email,
        type: 1,
        isUsed: false,
      },
      order: ['createdAt DESC'],
    });

    if (!otpEntry) {
      throw new HttpErrors.BadRequest('OTP expired or not found');
    }

    if (otpEntry.attempts >= 3) {
      throw new HttpErrors.BadRequest(
        'Maximum attempts reached, please request a new OTP',
      );
    }

    if (new Date(otpEntry.expiresAt) < new Date()) {
      await this.otpRepository.updateById(otpEntry.id, {
        isUsed: true,
        expiresAt: new Date(),
      });

      throw new HttpErrors.BadRequest('OTP expired, request a new one');
    }

    if (otpEntry.otp !== otp) {
      await this.otpRepository.updateById(otpEntry.id, {
        attempts: otpEntry.attempts + 1,
      });

      throw new HttpErrors.BadRequest('Invalid OTP');
    }

    await this.otpRepository.updateById(otpEntry.id, {
      isUsed: true,
      expiresAt: new Date(),
    });

    await this.registrationSessionsRepository.updateById(sessionId, {
      emailVerified: true,
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  // -----------------------------------------registration verification Otp's---------------------------
  @post('/auth/forget-password/send-email-otp')
  async sendForgetPasswordEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'role'],
            properties: {
              email: { type: 'string' },
              role: { type: 'string' },
            }
          }
        }
      }
    })
    body: {
      email: string;
      role: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({
      where: {
        and: [
          { email: body.email },
          { isDeleted: false }
        ]
      }
    });

    if (!user) {
      throw new HttpErrors.NotFound("User doesn't exist");
    }

    if (user && !user.isActive) {
      throw new HttpErrors.BadRequest("User is not active");
    }

    const role = await this.rolesRepository.findOne({
      where: { value: body.role }
    });

    if (!role) {
      throw new HttpErrors.BadRequest('Role not found');
    }

    const isUserRole = await this.userRolesRepository.findOne({
      where: { usersId: user.id, rolesId: role.id }
    });

    if (!isUserRole) {
      throw new HttpErrors.Unauthorized('Unauthorized access');
    }

    await this.otpRepository.updateAll(
      { isUsed: true, expiresAt: new Date() },
      { identifier: body.email, type: 1 }
    );

    const otp = await this.otpRepository.create({
      otp: '3421',
      type: 1,
      identifier: body.email,
      attempts: 0,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
    });

    if (!otp) {
      throw new HttpErrors.InternalServerError(
        process.env.NODE_ENV === 'dev'
          ? "Failed to create otp"
          : "Something went wrong"
      );
    }

    return {
      success: true,
      message: "OTP sent successfully",
    };
  }

  @post('/auth/forget-password/verify-email-otp')
  async verifyForgetPasswordEmailOtp(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'role', 'otp', 'newPassword'],
            properties: {
              email: { type: 'string' },
              otp: { type: 'string' },
              role: { type: 'string' },
              newPassword: { type: 'string' },
            }
          }
        }
      }
    })
    body: {
      email: string;
      otp: string;
      role: string;
      newPassword: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({
      where: {
        and: [
          { email: body.email },
          { isDeleted: false }
        ]
      }
    });

    if (!user) {
      throw new HttpErrors.NotFound("User doesn't exist");
    }

    if (user && !user.isActive) {
      throw new HttpErrors.BadRequest("User is not active");
    }

    const role = await this.rolesRepository.findOne({
      where: { value: body.role }
    });

    if (!role) {
      throw new HttpErrors.BadRequest('Role not found');
    }

    const isUserRole = await this.userRolesRepository.findOne({
      where: { usersId: user.id, rolesId: role.id }
    });

    if (!isUserRole) {
      throw new HttpErrors.Unauthorized('Unauthorized access');
    }

    const otpEntry = await this.otpRepository.findOne({
      where: {
        identifier: body.email,
        type: 1,
        isUsed: false,
      },
      order: ['createdAt DESC'],
    });

    if (!otpEntry) {
      throw new HttpErrors.BadRequest('OTP expired or not found');
    }

    if (otpEntry.attempts >= 3) {
      throw new HttpErrors.BadRequest(
        'Maximum attempts reached, please request a new OTP',
      );
    }

    if (new Date(otpEntry.expiresAt) < new Date()) {
      await this.otpRepository.updateById(otpEntry.id, {
        isUsed: true,
        expiresAt: new Date(),
      });

      throw new HttpErrors.BadRequest('OTP expired, request a new one');
    }

    if (otpEntry.otp !== body.otp) {
      await this.otpRepository.updateById(otpEntry.id, {
        attempts: otpEntry.attempts + 1,
      });

      throw new HttpErrors.BadRequest('Invalid OTP');
    }

    await this.otpRepository.updateById(otpEntry.id, {
      isUsed: true,
      expiresAt: new Date(),
    });

    const hashedPassword = await this.hasher.hashPassword(body.newPassword);

    await this.usersRepository.updateById(user.id, { password: hashedPassword });

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
  //     otp: '1234',
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
}

