import {Constructor, Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {Address, AddressRelations, Users} from '../models';
import {UsersRepository} from './users.repository';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class AddressRepository extends TimeStampRepositoryMixin<
  Address,
  typeof Address.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Address,
      typeof Address.prototype.id,
      AddressRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly user: BelongsToAccessor<
    Users,
    typeof Address.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Address, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
