import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {NavigationMenu, NavigationMenuRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class NavigationMenuRepository extends TimeStampRepositoryMixin<
  NavigationMenu,
  typeof NavigationMenu.prototype.id,
  Constructor<
    DefaultCrudRepository<
      NavigationMenu,
      typeof NavigationMenu.prototype.id,
      NavigationMenuRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(NavigationMenu, dataSource);
  }

  async findByLocation(
    location: NavigationMenu['location'],
  ): Promise<NavigationMenu | null> {
    return this.findOne({
      where: {location, enabled: true, isDeleted: false},
    });
  }

  async findEnabled(): Promise<NavigationMenu[]> {
    return this.find({
      where: {enabled: true, isDeleted: false},
    });
  }
}
