import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ShipmentEvent, ShipmentEventRelations} from '../models';

export class ShipmentEventRepository extends TimeStampRepositoryMixin<
  ShipmentEvent,
  typeof ShipmentEvent.prototype.id,
  Constructor<
    DefaultCrudRepository<ShipmentEvent, typeof ShipmentEvent.prototype.id, ShipmentEventRelations>
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ShipmentEvent, dataSource);
  }
}
