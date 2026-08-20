import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ShipmentLabel, ShipmentLabelRelations} from '../models';

export class ShipmentLabelRepository extends TimeStampRepositoryMixin<
  ShipmentLabel,
  typeof ShipmentLabel.prototype.id,
  Constructor<
    DefaultCrudRepository<ShipmentLabel, typeof ShipmentLabel.prototype.id, ShipmentLabelRelations>
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ShipmentLabel, dataSource);
  }
}
