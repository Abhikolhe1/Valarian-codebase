import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Order, Payment, PaymentRelations} from '../models';
import {OrderRepository} from './order.repository';

export class PaymentRepository extends TimeStampRepositoryMixin<
  Payment,
  typeof Payment.prototype.id,
  Constructor<DefaultCrudRepository<Payment, typeof Payment.prototype.id, PaymentRelations>>
>(DefaultCrudRepository) {
  public readonly order: BelongsToAccessor<Order, typeof Payment.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('OrderRepository')
    protected orderRepositoryGetter: Getter<OrderRepository>,
  ) {
    super(Payment, dataSource);
    this.order = this.createBelongsToAccessorFor('order', orderRepositoryGetter);
    this.registerInclusionResolver('order', this.order.inclusionResolver);
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const records = await this.find({where: {orderId}, limit: 1});
    return records[0] ?? null;
  }
}
