import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Order, OrderItemEntity, OrderItemEntityRelations, Product} from '../models';
import {OrderRepository} from './order.repository';
import {ProductRepository} from './product.repository';
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

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('OrderRepository')
    protected orderRepositoryGetter: Getter<OrderRepository>,
    @repository.getter('ProductRepository')
    protected productRepositoryGetter: Getter<ProductRepository>,
  ) {
    super(OrderItemEntity, dataSource);
    this.order = this.createBelongsToAccessorFor('order', orderRepositoryGetter);
    this.product = this.createBelongsToAccessorFor('product', productRepositoryGetter);

    this.registerInclusionResolver('order', this.order.inclusionResolver);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
  }
}
