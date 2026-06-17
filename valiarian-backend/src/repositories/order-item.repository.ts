import {Constructor, Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  HasOneRepositoryFactory,
  repository,
} from '@loopback/repository';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {
  Barcode,
  Order,
  OrderItemEntity,
  OrderItemEntityRelations,
  Product,
  ProductVariant,
} from '../models';
import {BarcodeRepository} from './barcode.repository';
import {OrderRepository} from './order.repository';
import {ProductRepository} from './product.repository';
import {ProductVariantRepository} from './product-variant.repository';
import {ValiarianDataSource} from '../datasources';

export class OrderItemRepository extends TimeStampRepositoryMixin<
  OrderItemEntity,
  typeof OrderItemEntity.prototype.id,
  Constructor<
    DefaultCrudRepository<
      OrderItemEntity,
      typeof OrderItemEntity.prototype.id,
      OrderItemEntityRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly order: BelongsToAccessor<Order, typeof OrderItemEntity.prototype.id>;

  public readonly product: BelongsToAccessor<Product, typeof OrderItemEntity.prototype.id>;

  public readonly variant: BelongsToAccessor<
    ProductVariant,
    typeof OrderItemEntity.prototype.id
  >;

  public readonly barcode: HasOneRepositoryFactory<
    Barcode,
    typeof OrderItemEntity.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('OrderRepository')
    protected orderRepositoryGetter: Getter<OrderRepository>,
    @repository.getter('ProductRepository')
    protected productRepositoryGetter: Getter<ProductRepository>,
    @repository.getter('ProductVariantRepository')
    protected productVariantRepositoryGetter: Getter<ProductVariantRepository>,
    @repository.getter('BarcodeRepository')
    protected barcodeRepositoryGetter: Getter<BarcodeRepository>,
  ) {
    super(OrderItemEntity, dataSource);
    this.order = this.createBelongsToAccessorFor('order', orderRepositoryGetter);
    this.product = this.createBelongsToAccessorFor('product', productRepositoryGetter);
    this.variant = this.createBelongsToAccessorFor('variant', productVariantRepositoryGetter);
    this.barcode = this.createHasOneRepositoryFactoryFor('barcode', barcodeRepositoryGetter);

    this.registerInclusionResolver('order', this.order.inclusionResolver);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
    this.registerInclusionResolver('variant', this.variant.inclusionResolver);
    this.registerInclusionResolver('barcode', this.barcode.inclusionResolver);
  }
}
