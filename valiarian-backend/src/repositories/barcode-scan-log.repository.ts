import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {
  Barcode,
  BarcodeScanLog,
  BarcodeScanLogRelations,
  Order,
  OrderItemEntity,
} from '../models';
import {BarcodeRepository} from './barcode.repository';
import {OrderItemRepository} from './order-item.repository';
import {OrderRepository} from './order.repository';

export class BarcodeScanLogRepository extends
  DefaultCrudRepository<
  BarcodeScanLog,
  typeof BarcodeScanLog.prototype.id,
  BarcodeScanLogRelations
> {
  public readonly barcode: BelongsToAccessor<Barcode, typeof BarcodeScanLog.prototype.id>;
  public readonly orderItem: BelongsToAccessor<
    OrderItemEntity,
    typeof BarcodeScanLog.prototype.id
  >;
  public readonly order: BelongsToAccessor<Order, typeof BarcodeScanLog.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('BarcodeRepository')
    protected barcodeRepositoryGetter: Getter<BarcodeRepository>,
    @repository.getter('OrderItemRepository')
    protected orderItemRepositoryGetter: Getter<OrderItemRepository>,
    @repository.getter('OrderRepository')
    protected orderRepositoryGetter: Getter<OrderRepository>,
  ) {
    super(BarcodeScanLog, dataSource);
    this.barcode = this.createBelongsToAccessorFor('barcode', barcodeRepositoryGetter);
    this.orderItem = this.createBelongsToAccessorFor('orderItem', orderItemRepositoryGetter);
    this.order = this.createBelongsToAccessorFor('order', orderRepositoryGetter);

    this.registerInclusionResolver('barcode', this.barcode.inclusionResolver);
    this.registerInclusionResolver('orderItem', this.orderItem.inclusionResolver);
    this.registerInclusionResolver('order', this.order.inclusionResolver);
  }
}
