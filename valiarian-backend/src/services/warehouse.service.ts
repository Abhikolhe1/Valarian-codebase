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
      warehouseId: warehouse?.id,
      bluedartAreaCode: warehouse?.bluedartAreaCode || process.env.BLUEDART_AREA_CODE || '',
      bluedartOriginArea: warehouse?.bluedartOriginArea || process.env.BLUEDART_ORIGIN_AREA || '',
      pincode: warehouse?.pincode || process.env.BLUEDART_SHIPPER_PINCODE || '',
      name: warehouse?.name || process.env.BLUEDART_SHIPPER_NAME || '',
      addressLine1: warehouse?.addressLine1 || process.env.BLUEDART_SHIPPER_ADDRESS_LINE1 || '',
      city: warehouse?.city || process.env.BLUEDART_SHIPPER_CITY || '',
      state: warehouse?.state || process.env.BLUEDART_SHIPPER_STATE || '',
      phone: warehouse?.contactPhone || process.env.BLUEDART_SHIPPER_PHONE || '',
    };
  }
}
