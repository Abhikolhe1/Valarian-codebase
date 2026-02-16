import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {NavigationMenu, NavigationMenuRelations} from '../models';

export class NavigationMenuRepository extends DefaultCrudRepository<
  NavigationMenu,
  typeof NavigationMenu.prototype.id,
  NavigationMenuRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(NavigationMenu, dataSource);
  }

  /**
   * Find navigation menu by location
   * @param location - Menu location (header, footer, sidebar, mobile)
   * @returns Navigation menu or null
   */
  async findByLocation(
    location: NavigationMenu['location'],
  ): Promise<NavigationMenu | null> {
    return this.findOne({
      where: {location, enabled: true},
    });
  }

  /**
   * Find all enabled navigation menus
   * @returns Array of enabled navigation menus
   */
  async findEnabled(): Promise<NavigationMenu[]> {
    return this.find({
      where: {enabled: true},
      order: ['location ASC'],
    });
  }
}
