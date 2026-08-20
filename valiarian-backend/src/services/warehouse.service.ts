import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Warehouse} from '../models';
import {WarehouseRepository} from '../repositories';

@injectable({scope: BindingScope.SINGLETON})
export class WarehouseService {
  private primaryWarehouseCache: Warehouse | null = null;

  constructor(
    @repository(WarehouseRepository)
    public warehouseRepository: WarehouseRepository,
  ) {}

  /**
   * Retrieves the default/primary warehouse.
   * Caches the result in memory.
   */
  async getPrimaryWarehouse(): Promise<Warehouse | null> {
    if (this.primaryWarehouseCache) {
      return this.primaryWarehouseCache;
    }

    const warehouse = await this.warehouseRepository.findOne({
      where: {isPrimary: true, isActive: true},
    });

    if (warehouse) {
      this.primaryWarehouseCache = warehouse;
    }

    return warehouse;
  }

  /**
   * Clears the in-memory cache when warehouses are modified.
   */
  clearCache() {
    this.primaryWarehouseCache = null;
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    return this.warehouseRepository.findOne({
      where: {id, isActive: true},
    });
  }

  /**
   * Returns shipper origin coordinates for waybill creation.
   * Falls back to environment variables if no warehouse matches.
   */
  async getOriginDetailsForShipment(warehouseId?: string) {
    let warehouse: Warehouse | null = null;

    if (warehouseId) {
      warehouse = await this.getWarehouseById(warehouseId);
    }

    if (!warehouse) {
      warehouse = await this.getPrimaryWarehouse();
    }

    return {
      bluedartAreaCode: warehouse?.bluedartAreaCode || process.env.BLUEDART_AREA_CODE || 'MUM',
      bluedartOriginArea: warehouse?.bluedartOriginArea || process.env.BLUEDART_ORIGIN_AREA || 'BOM',
      pincode: warehouse?.pincode || '400001',
      name: warehouse?.name || 'Valarian Origin Warehouse',
    };
  }
}
