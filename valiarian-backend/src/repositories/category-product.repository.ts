import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ValiarianDataSource} from '../datasources';
import {CategoryProduct, CategoryProductRelations} from '../models';

export class CategoryProductRepository extends TimeStampRepositoryMixin<
  CategoryProduct,
  typeof CategoryProduct.prototype.id,
  Constructor<
    DefaultCrudRepository<
      CategoryProduct,
      typeof CategoryProduct.prototype.id,
      CategoryProductRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(CategoryProduct, dataSource);
  }
}
