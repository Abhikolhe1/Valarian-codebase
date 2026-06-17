import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ContactSubmission, ContactSubmissionRelations} from '../models';

export class ContactSubmissionRepository extends TimeStampRepositoryMixin<
  ContactSubmission,
  typeof ContactSubmission.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ContactSubmission,
      typeof ContactSubmission.prototype.id,
      ContactSubmissionRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(ContactSubmission, dataSource);
  }
}
