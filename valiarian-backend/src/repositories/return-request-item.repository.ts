import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ReturnRequestItem, ReturnRequestItemRelations} from '../models';

export class ReturnRequestItemRepository extends TimeStampRepositoryMixin<
  ReturnRequestItem,
  typeof ReturnRequestItem.prototype.id,
  Constructor<
    DefaultCrudRepository<ReturnRequestItem, typeof ReturnRequestItem.prototype.id, ReturnRequestItemRelations>
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ReturnRequestItem, dataSource);
  }
}
