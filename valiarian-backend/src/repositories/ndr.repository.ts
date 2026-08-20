import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Ndr, NdrRelations} from '../models';

export class NdrRepository extends TimeStampRepositoryMixin<
  Ndr,
  typeof Ndr.prototype.id,
  Constructor<
    DefaultCrudRepository<Ndr, typeof Ndr.prototype.id, NdrRelations>
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(Ndr, dataSource);
  }
}
