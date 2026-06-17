import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  PermissionsRepository,
  RolePermissionsRepository,
  RolesRepository,
  UserRolesRepository,
  UsersRepository,
} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class RbacService {
  constructor(
    @repository(UsersRepository)
    private usersRepository: UsersRepository,
    @repository(UserRolesRepository)
    private userRolesRepo: UserRolesRepository,
    @repository(RolesRepository)
    private rolesRepo: RolesRepository,
    @repository(RolePermissionsRepository)
    private rolePermRepo: RolePermissionsRepository,
    @repository(PermissionsRepository)
    private permRepo: PermissionsRepository,
  ) { }

  // --------------------------------------------validate profile------------------------------------
  async getUserRoleAndPermissionsByRole(
    userId: string,
    roleValue: string,
  ): Promise<{roles: string[]; permissions: string[]}> {

    // 1️⃣ Get all user-role mappings
    const userRoles = await this.userRolesRepo.find({
      where: {usersId: userId},
    });

    if (!userRoles.length) {
      throw new Error('User has no roles assigned');
    }

    const roleIds = userRoles.map(r => r.rolesId);

    const roles = await this.rolesRepo.find({
      where: {id: {inq: roleIds}},
    });

    const allUserRoleValues = roles.map(r => r.value);

    if (!allUserRoleValues.includes(roleValue)) {

      const requestedRole = await this.rolesRepo.findOne({where: {value: roleValue}});

      const roleLabel = requestedRole?.label ?? roleValue; // fallback

      const userRoleLabels = roles.map(r => r.label);

      throw new Error(
        `ACCESS_DENIED: User does not have access as "${roleLabel}". User roles: [${userRoleLabels.join(', ')}]`
      );
    }

    const selectedRole = roles.find(r => r.value === roleValue);

    if (!selectedRole) {
      throw new Error('Selected role not found for user');
    }

    const rolePermissions = await this.rolePermRepo.find({
      where: {rolesId: selectedRole.id},
    });

    if (!rolePermissions.length) {
      return {
        roles: [roleValue],
        permissions: [],
      };
    }

    const permissionIds = rolePermissions.map(rp => rp.permissionsId);

    const permissions = await this.permRepo.find({
      where: {id: {inq: permissionIds}},
    });

    const permissionValues = permissions.map(p => p.permission);

    return {
      roles: [roleValue],
      permissions: permissionValues,
    };
  }

  async assignNewUserRole(userId: string, roleValue: string) {
    const role = await this.rolesRepo.findOne({
      where: {
        value: roleValue
      }
    });

    if (!role) {
      throw new HttpErrors.NotFound('No role found with given role');
    }

    const newRole = await this.userRolesRepo.create({
      usersId: userId,
      rolesId: role.id,
      isActive: true,
      isDeleted: false
    });

    return {
      success: true,
      message: 'Role is assigned to user',
      data: newRole
    }
  }

  // -------------------------------------------Return profiles--------------------------------------
  async returnSuperAdminProfile(userId: string, roles: string[], permissions: string[]) {
    const user = await this.usersRepository.findById(userId);
    const userData = {
      id: user.id,
      fullName: user.fullName,
      name: user.fullName, // Add name alias
      email: user.email,
      phone: user.phone,
      phoneNumber: user.phone, // Add phoneNumber alias
      isActive: user.isActive,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles,
      permissions
    };
    return userData;
  }

  // Get all roles and permissions for a user (without filtering by specific role)
  async getUserRolesAndPermissions(
    userId: string,
  ): Promise<{roles: string[]; permissions: string[]}> {
    // Get all user-role mappings
    const userRoles = await this.userRolesRepo.find({
      where: {usersId: userId},
    });

    if (!userRoles.length) {
      return {
        roles: [],
        permissions: [],
      };
    }

    const roleIds = userRoles.map(r => r.rolesId);

    // Get all roles for the user
    const roles = await this.rolesRepo.find({
      where: {id: {inq: roleIds}},
    });

    const roleValues = roles.map(r => r.value);

    // Get all permissions for these roles
    const rolePermissions = await this.rolePermRepo.find({
      where: {rolesId: {inq: roleIds}},
    });

    if (!rolePermissions.length) {
      return {
        roles: roleValues,
        permissions: [],
      };
    }

    const permissionIds = rolePermissions.map(rp => rp.permissionsId);

    // Get unique permissions
    const permissions = await this.permRepo.find({
      where: {id: {inq: permissionIds}},
    });

    const permissionValues = [...new Set(permissions.map(p => p.permission))];

    return {
      roles: roleValues,
      permissions: permissionValues,
    };
  }
}
