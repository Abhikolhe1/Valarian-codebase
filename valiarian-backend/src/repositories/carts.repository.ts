import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {Carts, CartsRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class CartsRepository extends TimeStampRepositoryMixin<
  Carts,
  typeof Carts.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Carts,
      typeof Carts.prototype.id,
      CartsRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(Carts, dataSource);
  }
}
