import {BindingScope, injectable, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {OrderRepository, OrderItemRepository, ProductRepository} from '../repositories';
import {ShippingAuditService} from './shipping-audit.service';
import {IsolationLevel} from '@loopback/repository';

@injectable({scope: BindingScope.SINGLETON})
export class InventoryLifecycleService {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(OrderItemRepository)
    public orderItemRepository: OrderItemRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject('services.shipping-audit')
    public auditService: ShippingAuditService,
  ) {}

  /**
   * Safe SQL execution wrapper.
   */
  private async runQuery(sql: string, params: any[], transaction?: any): Promise<any> {
    return this.orderRepository.dataSource.execute(sql, params, {transaction});
  }

  /**
   * Helper to check if an update affected exactly one row.
   */
  private checkAffected(result: any): boolean {
    if (Array.isArray(result)) return result.length > 0;
    if (Array.isArray(result?.rows)) return result.rows.length > 0;
    return (result?.affectedRows || result?.count || 0) > 0;
  }

  /**
   * reserveOnOrderConfirmed
   *
   * Increments reservedQuantity for each product/variant.
   * Ensures stockQuantity - (reservedQuantity + requestedQty) >= 0.
   */
  async reserveOnOrderConfirmed(orderId: string, triggerUserId?: string, triggerUserEmail?: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (order.inventoryReserved) {
      return; // Already reserved
    }

    const items = await this.orderItemRepository.find({where: {orderId}});
    const transaction = await this.orderRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      for (const item of items) {
        let reserved = false;

        if (item.variantId) {
          const sql = `
            UPDATE public.product_variants
            SET reservedquantity = reservedquantity + $1,
                updatedat = NOW()
            WHERE id = $2 AND (stockquantity - (reservedquantity + $1)) >= 0
            RETURNING id;
          `;
          const result = await this.runQuery(sql, [item.quantity, item.variantId], transaction);
          reserved = this.checkAffected(result);

          if (reserved) {
            // Sync overall product reserved quantity as well
            const prodSql = `
              UPDATE public.products
              SET reservedquantity = reservedquantity + $1,
                  updatedat = NOW()
              WHERE id = $2;
            `;
            await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
          }
        } else {
          const sql = `
            UPDATE public.products
            SET reservedquantity = reservedquantity + $1,
                updatedat = NOW()
            WHERE id = $2 AND (stockquantity - (reservedquantity + $1)) >= 0
            RETURNING id;
          `;
          const result = await this.runQuery(sql, [item.quantity, item.productId], transaction);
          reserved = this.checkAffected(result);
        }

        if (!reserved) {
          throw new HttpErrors.Conflict(
            `Insufficient stock to reserve item: ${item.productNameSnapshot} (Qty: ${item.quantity})`,
          );
        }
      }

      await this.orderRepository.updateById(orderId, {inventoryReserved: true, updatedAt: new Date()}, {transaction});
      await transaction.commit();

      await this.auditService.logInventoryMutation(
        triggerUserId || 'system',
        triggerUserEmail || 'system@valarian.com',
        orderId,
        'reserve',
        {reserved: items.map(i => ({productId: i.productId, variantId: i.variantId, qty: i.quantity}))},
      );
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * deductOnShipment
   *
   * Physical deduction of inventory.
   * Decrements stockQuantity and reservedQuantity.
   */
  async deductOnShipment(orderId: string, triggerUserId?: string, triggerUserEmail?: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (order.inventoryDeducted) {
      return; // Already deducted
    }

    if (!order.inventoryReserved) {
      // If order stock was not reserved previously, reserve first (COD/post-payment path compatibility)
      await this.reserveOnOrderConfirmed(orderId, triggerUserId, triggerUserEmail);
    }

    const items = await this.orderItemRepository.find({where: {orderId}});
    const transaction = await this.orderRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      for (const item of items) {
        if (item.variantId) {
          const variantSql = `
            UPDATE public.product_variants
            SET stockquantity = GREATEST(stockquantity - $1, 0),
                reservedquantity = GREATEST(reservedquantity - $1, 0),
                instock = GREATEST(stockquantity - $1, 0) > 0,
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(variantSql, [item.quantity, item.variantId], transaction);

          // Update parent product counters
          const prodSql = `
            UPDATE public.products
            SET stockquantity = GREATEST(stockquantity - $1, 0),
                reservedquantity = GREATEST(reservedquantity - $1, 0),
                instock = GREATEST(stockquantity - $1, 0) > 0,
                soldcount = soldcount + $1,
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        } else {
          const prodSql = `
            UPDATE public.products
            SET stockquantity = GREATEST(stockquantity - $1, 0),
                reservedquantity = GREATEST(reservedquantity - $1, 0),
                instock = GREATEST(stockquantity - $1, 0) > 0,
                soldcount = soldcount + $1,
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        }
      }

      await this.orderRepository.updateById(
        orderId,
        {
          inventoryDeducted: true,
          updatedAt: new Date(),
        },
        {transaction},
      );

      await transaction.commit();

      await this.auditService.logInventoryMutation(
        triggerUserId || 'system',
        triggerUserEmail || 'system@valarian.com',
        orderId,
        'deduct',
        {deducted: items.map(i => ({productId: i.productId, variantId: i.variantId, qty: i.quantity}))},
      );
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * releaseReservationOnCancellation
   *
   * Releases reservations when order cancelled before shipment.
   */
  async releaseReservationOnCancellation(orderId: string, triggerUserId?: string, triggerUserEmail?: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order.inventoryReserved || order.inventoryRestored) {
      return; // No reservation to release, or already restored
    }

    const items = await this.orderItemRepository.find({where: {orderId}});
    const transaction = await this.orderRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      for (const item of items) {
        if (item.variantId) {
          const variantSql = `
            UPDATE public.product_variants
            SET reservedquantity = GREATEST(reservedquantity - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(variantSql, [item.quantity, item.variantId], transaction);

          const prodSql = `
            UPDATE public.products
            SET reservedquantity = GREATEST(reservedquantity - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        } else {
          const prodSql = `
            UPDATE public.products
            SET reservedquantity = GREATEST(reservedquantity - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        }
      }

      await this.orderRepository.updateById(
        orderId,
        {
          inventoryRestored: true,
          updatedAt: new Date(),
        },
        {transaction},
      );

      await transaction.commit();

      await this.auditService.logInventoryMutation(
        triggerUserId || 'system',
        triggerUserEmail || 'system@valarian.com',
        orderId,
        'release',
        {released: items.map(i => ({productId: i.productId, variantId: i.variantId, qty: i.quantity}))},
      );
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * restoreOnVoidedShipment
   *
   * Restores inventory after AWB is cancelled. Since stock was deducted,
   * we increment stockQuantity back.
   */
  async restoreOnVoidedShipment(orderId: string, triggerUserId?: string, triggerUserEmail?: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order.inventoryDeducted || order.inventoryRestored) {
      return; // Cannot restore if never deducted, or already restored
    }

    const items = await this.orderItemRepository.find({where: {orderId}});
    const transaction = await this.orderRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      for (const item of items) {
        if (item.variantId) {
          const variantSql = `
            UPDATE public.product_variants
            SET stockquantity = stockquantity + $1,
                instock = true,
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(variantSql, [item.quantity, item.variantId], transaction);

          const prodSql = `
            UPDATE public.products
            SET stockquantity = stockquantity + $1,
                instock = true,
                soldcount = GREATEST(soldcount - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        } else {
          const prodSql = `
            UPDATE public.products
            SET stockquantity = stockquantity + $1,
                instock = true,
                soldcount = GREATEST(soldcount - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        }
      }

      await this.orderRepository.updateById(
        orderId,
        {
          inventoryRestored: true,
          inventoryReserved: false,
          inventoryDeducted: false,
          updatedAt: new Date(),
        },
        {transaction},
      );

      await transaction.commit();

      await this.auditService.logInventoryMutation(
        triggerUserId || 'system',
        triggerUserEmail || 'system@valarian.com',
        orderId,
        'restore_void',
        {restored: items.map(i => ({productId: i.productId, variantId: i.variantId, qty: i.quantity}))},
      );
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * restoreOnRtoDelivered
   *
   * Increments stock quantity when RTO package reaches origin warehouse.
   */
  async restoreOnRtoDelivered(orderId: string, triggerUserId?: string, triggerUserEmail?: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order.inventoryDeducted || order.rtoInventoryRestored) {
      return; // Already restored or never deducted
    }

    if (process.env.RTO_AUTO_RESTORE_INVENTORY === 'false') {
      console.log(`[InventoryLifecycle] RTO auto-restore skipped per config for Order ${orderId}`);
      return;
    }

    const items = await this.orderItemRepository.find({where: {orderId}});
    const transaction = await this.orderRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      for (const item of items) {
        if (item.variantId) {
          const variantSql = `
            UPDATE public.product_variants
            SET stockquantity = stockquantity + $1,
                instock = true,
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(variantSql, [item.quantity, item.variantId], transaction);

          const prodSql = `
            UPDATE public.products
            SET stockquantity = stockquantity + $1,
                instock = true,
                soldcount = GREATEST(soldcount - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        } else {
          const prodSql = `
            UPDATE public.products
            SET stockquantity = stockquantity + $1,
                instock = true,
                soldcount = GREATEST(soldcount - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.quantity, item.productId], transaction);
        }
      }

      await this.orderRepository.updateById(
        orderId,
        {
          rtoInventoryRestored: true,
          inventoryRestored: true,
          updatedAt: new Date(),
        },
        {transaction},
      );

      await transaction.commit();

      await this.auditService.logInventoryMutation(
        triggerUserId || 'system',
        triggerUserEmail || 'system@valarian.com',
        orderId,
        'restore_rto',
        {restored: items.map(i => ({productId: i.productId, variantId: i.variantId, qty: i.quantity}))},
      );
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * restoreOnReturnApproved
   *
   * Restores items approved in return requested inspection.
   * Maps back return items restocked quantities.
   */
  async restoreOnReturnApproved(
    orderId: string,
    restockItems: {productId: string; variantId?: string; restockedQuantity: number}[],
    triggerUserId?: string,
    triggerUserEmail?: string,
  ): Promise<void> {
    if (restockItems.length === 0) return;

    const transaction = await this.orderRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      for (const item of restockItems) {
        if (item.restockedQuantity <= 0) continue;

        if (item.variantId) {
          const variantSql = `
            UPDATE public.product_variants
            SET stockquantity = stockquantity + $1,
                instock = true,
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(variantSql, [item.restockedQuantity, item.variantId], transaction);

          const prodSql = `
            UPDATE public.products
            SET stockquantity = stockquantity + $1,
                instock = true,
                soldcount = GREATEST(soldcount - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.restockedQuantity, item.productId], transaction);
        } else {
          const prodSql = `
            UPDATE public.products
            SET stockquantity = stockquantity + $1,
                instock = true,
                soldcount = GREATEST(soldcount - $1, 0),
                updatedat = NOW()
            WHERE id = $2;
          `;
          await this.runQuery(prodSql, [item.restockedQuantity, item.productId], transaction);
        }
      }

      await this.orderRepository.updateById(
        orderId,
        {
          inventoryRestored: true,
          updatedAt: new Date(),
        },
        {transaction},
      );

      await transaction.commit();

      await this.auditService.logInventoryMutation(
        triggerUserId || 'system',
        triggerUserEmail || 'system@valarian.com',
        orderId,
        'restore_return',
        {restored: restockItems},
      );
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
