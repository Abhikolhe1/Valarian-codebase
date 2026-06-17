import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {
  Barcode,
  Order,
  OrderItemEntity,
  ReturnRequest,
  ReturnRequestRelations,
  Users,
} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {BarcodeRepository} from './barcode.repository';
import {OrderItemRepository} from './order-item.repository';
import {OrderRepository} from './order.repository';
import {UsersRepository} from './users.repository';

export class ReturnRequestRepository extends TimeStampRepositoryMixin<
  ReturnRequest,
  typeof ReturnRequest.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ReturnRequest,
      typeof ReturnRequest.prototype.id,
      ReturnRequestRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly barcode: BelongsToAccessor<Barcode, typeof ReturnRequest.prototype.id>;
  public readonly orderItem: BelongsToAccessor<
    OrderItemEntity,
    typeof ReturnRequest.prototype.id
  >;
  public readonly order: BelongsToAccessor<Order, typeof ReturnRequest.prototype.id>;
  public readonly requester: BelongsToAccessor<Users, typeof ReturnRequest.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('BarcodeRepository')
    protected barcodeRepositoryGetter: Getter<BarcodeRepository>,
    @repository.getter('OrderItemRepository')
    protected orderItemRepositoryGetter: Getter<OrderItemRepository>,
    @repository.getter('OrderRepository')
    protected orderRepositoryGetter: Getter<OrderRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(ReturnRequest, dataSource);
    this.barcode = this.createBelongsToAccessorFor('barcode', barcodeRepositoryGetter);
    this.orderItem = this.createBelongsToAccessorFor('orderItem', orderItemRepositoryGetter);
    this.order = this.createBelongsToAccessorFor('order', orderRepositoryGetter);
    this.requester = this.createBelongsToAccessorFor('requester', usersRepositoryGetter);

    this.registerInclusionResolver('barcode', this.barcode.inclusionResolver);
    this.registerInclusionResolver('orderItem', this.orderItem.inclusionResolver);
    this.registerInclusionResolver('order', this.order.inclusionResolver);
    this.registerInclusionResolver('requester', this.requester.inclusionResolver);
  }
}
