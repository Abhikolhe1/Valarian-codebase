import {Constructor, Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ValiarianDataSource} from '../datasources';
import {ProductVariant, ProductVariantRelations} from '../models/product-variant.model';
import {Product} from '../models/product.model';
import {ProductRepository} from './product.repository';

export class ProductVariantRepository extends TimeStampRepositoryMixin<
  ProductVariant,
  typeof ProductVariant.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ProductVariant,
      typeof ProductVariant.prototype.id,
      ProductVariantRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly product: BelongsToAccessor<Product, typeof ProductVariant.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('ProductRepository') protected productRepositoryGetter: Getter<ProductRepository>,
  ) {
    super(ProductVariant, dataSource);
    this.product = this.createBelongsToAccessorFor('product', productRepositoryGetter);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
  }
}
