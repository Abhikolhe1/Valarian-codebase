import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {ShipmentItem, ShipmentItemRelations} from '../models';

export class ShipmentItemRepository extends DefaultCrudRepository<
  ShipmentItem,
  typeof ShipmentItem.prototype.id,
  ShipmentItemRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ShipmentItem, dataSource);
  }
}
