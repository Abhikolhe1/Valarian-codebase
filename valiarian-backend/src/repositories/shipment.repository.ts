import {Constructor, Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {
  Shipment,
  ShipmentRelations,
  ShipmentEvent,
  ShipmentItem,
  ShipmentLabel,
} from '../models';
import {ShipmentEventRepository} from './shipment-event.repository';
import {ShipmentItemRepository} from './shipment-item.repository';
import {ShipmentLabelRepository} from './shipment-label.repository';

export class ShipmentRepository extends TimeStampRepositoryMixin<
  Shipment,
  typeof Shipment.prototype.id,
  Constructor<
    DefaultCrudRepository<Shipment, typeof Shipment.prototype.id, ShipmentRelations>
  >
>(DefaultCrudRepository) {
  public readonly events: HasManyRepositoryFactory<
    ShipmentEvent,
    typeof Shipment.prototype.id
  >;

  public readonly shipmentItems: HasManyRepositoryFactory<
    ShipmentItem,
    typeof Shipment.prototype.id
  >;

  public readonly labels: HasManyRepositoryFactory<
    ShipmentLabel,
    typeof Shipment.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('ShipmentEventRepository')
    protected shipmentEventRepositoryGetter: Getter<ShipmentEventRepository>,
    @repository.getter('ShipmentItemRepository')
    protected shipmentItemRepositoryGetter: Getter<ShipmentItemRepository>,
    @repository.getter('ShipmentLabelRepository')
    protected shipmentLabelRepositoryGetter: Getter<ShipmentLabelRepository>,
  ) {
    super(Shipment, dataSource);
    this.events = this.createHasManyRepositoryFactoryFor(
      'events',
      shipmentEventRepositoryGetter,
    );
    this.registerInclusionResolver('events', this.events.inclusionResolver);

    this.shipmentItems = this.createHasManyRepositoryFactoryFor(
      'shipmentItems',
      shipmentItemRepositoryGetter,
    );
    this.registerInclusionResolver('shipmentItems', this.shipmentItems.inclusionResolver);

    this.labels = this.createHasManyRepositoryFactoryFor(
      'labels',
      shipmentLabelRepositoryGetter,
    );
    this.registerInclusionResolver('labels', this.labels.inclusionResolver);
  }
}
