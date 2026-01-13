import { Constructor, inject, Getter } from '@loopback/core';
import { DefaultCrudRepository, repository, HasManyThroughRepositoryFactory, HasManyRepositoryFactory } from '@loopback/repository';
import { ValiarianDataSource } from '../datasources';
import { Users, UsersRelations, Roles, UserRoles } from '../models';
import { TimeStampRepositoryMixin } from '../mixins/timestamp-repository-mixin';
import { UserRolesRepository } from './user-roles.repository';
import { RolesRepository } from './roles.repository';

export class UsersRepository extends TimeStampRepositoryMixin<
  Users,
  typeof Users.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Users,
      typeof Users.prototype.id,
      UsersRelations
    >
  >
>(DefaultCrudRepository) {

  public readonly roles: HasManyThroughRepositoryFactory<Roles, typeof Roles.prototype.id,
    UserRoles,
    typeof Users.prototype.id
  >;


  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource, @repository.getter('UserRolesRepository') protected userRolesRepositoryGetter: Getter<UserRolesRepository>, @repository.getter('RolesRepository') protected rolesRepositoryGetter: Getter<RolesRepository>,
  ) {
    super(Users, dataSource);
  }
}
