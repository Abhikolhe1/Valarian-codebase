import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {Carts, CartsRelations} from '../models';

export class CartsRepository extends DefaultCrudRepository<
  Carts,
  typeof Carts.prototype.id,
  CartsRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(Carts, dataSource);
  }
}
