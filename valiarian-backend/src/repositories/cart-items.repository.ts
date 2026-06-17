import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {CartItems, CartItemsRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class CartItemsRepository extends TimeStampRepositoryMixin<
  CartItems,
  typeof CartItems.prototype.id,
  Constructor<
    DefaultCrudRepository<
      CartItems,
      typeof CartItems.prototype.id,
      CartItemsRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(CartItems, dataSource);
  }
}
