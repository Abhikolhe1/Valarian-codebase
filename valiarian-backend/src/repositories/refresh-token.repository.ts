import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {RefreshToken, RefreshTokenRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class RefreshTokenRepository extends TimeStampRepositoryMixin<
  RefreshToken,
  typeof RefreshToken.prototype.id,
  Constructor<
    DefaultCrudRepository<
      RefreshToken,
      typeof RefreshToken.prototype.id,
      RefreshTokenRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(RefreshToken, dataSource);
  }
}
