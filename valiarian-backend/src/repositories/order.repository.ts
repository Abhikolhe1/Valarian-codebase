import {Constructor, Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  Filter,
  HasManyRepositoryFactory,
  HasOneRepositoryFactory,
  repository,
  Where,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Invoice, Order, OrderItemEntity, OrderRelations, Payment, Users} from '../models';
import {InvoiceRepository} from './invoice.repository';
import {OrderItemRepository} from './order-item.repository';
import {PaymentRepository} from './payment.repository';
import {UsersRepository} from './users.repository';

export interface OrderSearchOptions {
  search?: string;
  status?: string;
  paymentStatus?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
  order?: string[];
}

export interface PaginatedOrderResult {
  data: Order[];
  total: number;
  limit: number;
  skip: number;
}

export class OrderRepository extends TimeStampRepositoryMixin<
  Order,
  typeof Order.prototype.id,
  Constructor<
    DefaultCrudRepository<Order, typeof Order.prototype.id, OrderRelations>
  >
>(DefaultCrudRepository) {

  public readonly user: BelongsToAccessor<Users, typeof Order.prototype.id>;

  public readonly orderItems: HasManyRepositoryFactory<
    OrderItemEntity,
    typeof Order.prototype.id
  >;

  public readonly payment: HasOneRepositoryFactory<Payment, typeof Order.prototype.id>;

  public readonly invoice: HasOneRepositoryFactory<Invoice, typeof Order.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('OrderItemRepository')
    protected orderItemRepositoryGetter: Getter<OrderItemRepository>,
    @repository.getter('PaymentRepository')
    protected paymentRepositoryGetter: Getter<PaymentRepository>,
    @repository.getter('InvoiceRepository')
    protected invoiceRepositoryGetter: Getter<InvoiceRepository>,
  ) {
    super(Order, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.orderItems = this.createHasManyRepositoryFactoryFor(
      'orderItems',
      orderItemRepositoryGetter,
    );
    this.payment = this.createHasOneRepositoryFactoryFor('payment', paymentRepositoryGetter);
    this.invoice = this.createHasOneRepositoryFactoryFor('invoice', invoiceRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.registerInclusionResolver('orderItems', this.orderItems.inclusionResolver);
    this.registerInclusionResolver('payment', this.payment.inclusionResolver);
    this.registerInclusionResolver('invoice', this.invoice.inclusionResolver);
  }

  async generateOrderNumber(prefix = 'ORD'): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const startOfDay = new Date(year, date.getMonth(), date.getDate());
    const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);

    const todayCount = await this.count({
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      } as any,
    });

    const sequence = String(todayCount.count + 1).padStart(4, '0');
    return `${prefix}-${year}${month}${day}-${sequence}`;
  }

  async findByUserId(userId: string, filter?: Filter<Order>): Promise<Order[]> {
    return this.find({
      ...filter,
      where: {
        ...filter?.where,
        userId,
        isDeleted: false,
      } as any,
    });
  }

  async findByStatus(status: string, filter?: Filter<Order>): Promise<Order[]> {
    return this.find({
      ...filter,
      where: {
        ...filter?.where,
        status,
        isDeleted: false,
      } as any,
    });
  }

  async findByPaymentStatus(
    paymentStatus: string,
    filter?: Filter<Order>,
  ): Promise<Order[]> {
    return this.find({
      ...filter,
      where: {
        ...filter?.where,
        paymentStatus,
        isDeleted: false,
      } as any,
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const orders = await this.find({
      where: {
        orderNumber,
        isDeleted: false,
      },
      limit: 1,
    });
    return orders.length > 0 ? orders[0] : null;
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
    const orders = await this.find({
      where: {
        razorpayOrderId,
        isDeleted: false,
      },
      limit: 1,
    });
    return orders.length > 0 ? orders[0] : null;
  }

  async searchOrders(options: OrderSearchOptions): Promise<PaginatedOrderResult> {
    const {
      search,
      status,
      paymentStatus,
      userId,
      startDate,
      endDate,
      limit = 20,
      skip = 0,
      order = ['createdAt DESC'],
    } = options;

    const andConditions: Where<Order>[] = [{isDeleted: false}];

    if (search) {
      andConditions.push({
        orderNumber: {ilike: `%${search}%`},
      } as any);
    }

    if (status) {
      andConditions.push({status} as any);
    }

    if (paymentStatus) {
      andConditions.push({paymentStatus} as any);
    }

    if (userId) {
      andConditions.push({userId});
    }

    if (startDate) {
      andConditions.push({
        createdAt: {gte: startDate},
      } as any);
    }

    if (endDate) {
      andConditions.push({
        createdAt: {lte: endDate},
      } as any);
    }

    const where: Where<Order> =
      andConditions.length > 0 ? ({and: andConditions} as any) : {};

    const filter: Filter<Order> = {
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      skip,
      order,
    };

    const total = await this.count(filter.where);
    const data = await this.find(filter);

    return {
      data,
      total: total.count,
      limit,
      skip,
    };
  }

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
    refunded: number;
  }> {
    const [
      total,
      pending,
      confirmed,
      processing,
      shipped,
      delivered,
      cancelled,
      returned,
      refunded,
    ] = await Promise.all([
      this.count({isDeleted: false}),
      this.count({status: 'pending', isDeleted: false}),
      this.count({status: 'confirmed', isDeleted: false}),
      this.count({status: 'processing', isDeleted: false}),
      this.count({status: 'shipped', isDeleted: false}),
      this.count({status: 'delivered', isDeleted: false}),
      this.count({status: 'cancelled', isDeleted: false}),
      this.count({status: 'returned', isDeleted: false}),
      this.count({status: 'refunded', isDeleted: false}),
    ]);

    return {
      total: total.count,
      pending: pending.count,
      confirmed: confirmed.count,
      processing: processing.count,
      shipped: shipped.count,
      delivered: delivered.count,
      cancelled: cancelled.count,
      returned: returned.count,
      refunded: refunded.count,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.updateById(id, {
      isDeleted: true,
      updatedAt: new Date(),
    });
  }

  canBeCancelled(order: Order): boolean {
    return order.status === 'pending' || order.status === 'confirmed';
  }

  canBeReturned(order: Order, returnWindowDays = 7): boolean {
    if (order.status !== 'delivered' || !order.deliveredAt) {
      return false;
    }

    const now = new Date();
    const deliveryDate = new Date(order.deliveredAt);
    const daysSinceDelivery =
      (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceDelivery <= returnWindowDays;
  }
}
