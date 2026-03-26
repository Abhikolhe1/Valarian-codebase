import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {AboutPage, AboutPageRelations} from '../models';

export class AboutPageRepository extends DefaultCrudRepository<
  AboutPage,
  typeof AboutPage.prototype.id,
  AboutPageRelations
> {
  constructor(@inject('datasources.valiarian') dataSource: ValiarianDataSource) {
    super(AboutPage, dataSource);
  }
}
