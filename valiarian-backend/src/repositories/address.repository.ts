import {Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  repository,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import { Address, AddressRelations, Users} from '../models';
import {UsersRepository} from './users.repository';

export class AddressRepository extends DefaultCrudRepository<
  Address,
  typeof Address.prototype.id,
  AddressRelations
> {
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

    this.user = this.createBelongsToAccessorFor(
      'user',
      usersRepositoryGetter,
    );

    this.registerInclusionResolver(
      'user',
      this.user.inclusionResolver,
    );
  }
}
