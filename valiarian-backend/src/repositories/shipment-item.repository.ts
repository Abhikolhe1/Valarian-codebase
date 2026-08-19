import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ShipmentItem, ShipmentItemRelations} from '../models';

export class ShipmentItemRepository extends TimeStampRepositoryMixin<
  ShipmentItem,
  typeof ShipmentItem.prototype.id,
  Constructor<
    DefaultCrudRepository<ShipmentItem, typeof ShipmentItem.prototype.id, ShipmentItemRelations>
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ShipmentItem, dataSource);
  }
}
