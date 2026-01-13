import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {UserRoles, UserRolesRelations} from '../models';

export class UserRolesRepository extends TimeStampRepositoryMixin<
  UserRoles,
  typeof UserRoles.prototype.id,
  Constructor<
    DefaultCrudRepository<
      UserRoles,
      typeof UserRoles.prototype.id,
      UserRolesRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(UserRoles, dataSource);
  }
}
