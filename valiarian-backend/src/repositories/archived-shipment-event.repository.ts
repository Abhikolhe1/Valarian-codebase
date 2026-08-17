import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ArchivedShipmentEvent, ArchivedShipmentEventRelations} from '../models';

export class ArchivedShipmentEventRepository extends TimeStampRepositoryMixin<
  ArchivedShipmentEvent,
  typeof ArchivedShipmentEvent.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ArchivedShipmentEvent,
      typeof ArchivedShipmentEvent.prototype.id,
      ArchivedShipmentEventRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ArchivedShipmentEvent, dataSource);
  }
}
