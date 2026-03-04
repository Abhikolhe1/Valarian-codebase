import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository, Filter} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {OrderStatusHistory, OrderStatusHistoryRelations} from '../models';

export class OrderStatusHistoryRepository extends TimeStampRepositoryMixin<
  OrderStatusHistory,
  typeof OrderStatusHistory.prototype.id,
  Constructor<
    DefaultCrudRepository<
      OrderStatusHistory,
      typeof OrderStatusHistory.prototype.id,
      OrderStatusHistoryRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(OrderStatusHistory, dataSource);
  }

  /**
   * Find status history by order ID
   * @param orderId - Order ID
   * @param filter - Optional filter
   * @returns Array of status history entries
   */
  async findByOrderId(
    orderId: string,
    filter?: Filter<OrderStatusHistory>,
  ): Promise<OrderStatusHistory[]> {
    return this.find({
      ...filter,
      where: {
        ...filter?.where,
        orderId,
      } as any,
      order: ['createdAt DESC'],
    });
  }

  /**
   * Get latest status for an order
   * @param orderId - Order ID
   * @returns Latest status history entry or null
   */
  async getLatestStatus(orderId: string): Promise<OrderStatusHistory | null> {
    const history = await this.find({
      where: {orderId},
      order: ['createdAt DESC'],
      limit: 1,
    });
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Create status history entry
   * @param orderId - Order ID
   * @param status - New status
   * @param changedBy - User ID who changed the status
   * @param comment - Optional comment
   * @returns Created status history entry
   */
  async createStatusEntry(
    orderId: string,
    status: string,
    changedBy: string,
    comment?: string,
  ): Promise<OrderStatusHistory> {
    const {v4: uuidv4} = require('uuid');

    return this.create({
      id: uuidv4(),
      orderId,
      status,
      changedBy,
      comment,
      createdAt: new Date(),
    });
  }
}
