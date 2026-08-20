import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Warehouse, WarehouseRelations} from '../models';

export class WarehouseRepository extends TimeStampRepositoryMixin<
  Warehouse,
  typeof Warehouse.prototype.id,
  Constructor<
    DefaultCrudRepository<Warehouse, typeof Warehouse.prototype.id, WarehouseRelations>
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(Warehouse, dataSource);
  }
}
