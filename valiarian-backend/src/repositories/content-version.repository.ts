import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ContentVersion, ContentVersionRelations} from '../models';

export class ContentVersionRepository extends TimeStampRepositoryMixin<
  ContentVersion,
  typeof ContentVersion.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ContentVersion,
      typeof ContentVersion.prototype.id,
      ContentVersionRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.valiarian') dataSource: ValiarianDataSource) {
    super(ContentVersion, dataSource);
  }
}
