import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Invoice, InvoiceRelations, Order} from '../models';
import {OrderRepository} from './order.repository';

export class InvoiceRepository extends TimeStampRepositoryMixin<
  Invoice,
  typeof Invoice.prototype.id,
  Constructor<DefaultCrudRepository<Invoice, typeof Invoice.prototype.id, InvoiceRelations>>
>(DefaultCrudRepository) {
  public readonly order: BelongsToAccessor<Order, typeof Invoice.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('OrderRepository')
    protected orderRepositoryGetter: Getter<OrderRepository>,
  ) {
    super(Invoice, dataSource);
    this.order = this.createBelongsToAccessorFor('order', orderRepositoryGetter);
    this.registerInclusionResolver('order', this.order.inclusionResolver);
  }

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    const records = await this.find({where: {orderId}, limit: 1});
    return records[0] ?? null;
  }
}
