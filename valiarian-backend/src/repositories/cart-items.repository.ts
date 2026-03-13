import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {CartItems, CartItemsRelations} from '../models';

export class CartItemsRepository extends DefaultCrudRepository<
  CartItems,
  typeof CartItems.prototype.id,
  CartItemsRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(CartItems, dataSource);
  }
}
