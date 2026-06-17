import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {Barcode, BarcodeRelations, OrderItemEntity} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {OrderItemRepository} from './order-item.repository';

export class BarcodeRepository extends TimeStampRepositoryMixin<
  Barcode,
  typeof Barcode.prototype.id,
  Constructor<DefaultCrudRepository<Barcode, typeof Barcode.prototype.id, BarcodeRelations>>
>(DefaultCrudRepository) {
  public readonly orderItem: BelongsToAccessor<
    OrderItemEntity,
    typeof Barcode.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('OrderItemRepository')
    protected orderItemRepositoryGetter: Getter<OrderItemRepository>,
  ) {
    super(Barcode, dataSource);
    this.orderItem = this.createBelongsToAccessorFor(
      'orderItem',
      orderItemRepositoryGetter,
    );
    this.registerInclusionResolver('orderItem', this.orderItem.inclusionResolver);
  }

  async findByCode(code: string, options?: object): Promise<Barcode | null> {
    const result = await this.find({
      where: {code},
      limit: 1,
    }, options);

    return result[0] ?? null;
  }

  async findByOrderItemId(orderItemId: string, options?: object): Promise<Barcode | null> {
    const result = await this.find({
      where: {orderItemId},
      limit: 1,
    }, options);

    return result[0] ?? null;
  }
}
