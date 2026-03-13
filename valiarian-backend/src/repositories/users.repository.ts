import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, HasManyThroughRepositoryFactory, repository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Media, Roles, UserRoles, Users, UsersRelations} from '../models';
import {MediaRepository} from './media.repository';
import {RolesRepository} from './roles.repository';
import {UserRolesRepository} from './user-roles.repository';

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

  public readonly avatar: BelongsToAccessor<Media, typeof Users.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('UserRolesRepository') protected userRolesRepositoryGetter: Getter<UserRolesRepository>,
    @repository.getter('RolesRepository') protected rolesRepositoryGetter: Getter<RolesRepository>,
    @repository.getter('MediaRepository') protected mediaRepositoryGetter: Getter<MediaRepository>,
  ) {
    super(Users, dataSource);
    this.avatar = this.createBelongsToAccessorFor('avatar', mediaRepositoryGetter);
    this.registerInclusionResolver('avatar', this.avatar.inclusionResolver);
  }
}
