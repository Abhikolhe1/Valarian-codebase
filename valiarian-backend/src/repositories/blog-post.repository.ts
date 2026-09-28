import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {BlogPost, BlogPostRelations} from '../models';

export class BlogPostRepository extends DefaultCrudRepository<
  BlogPost,
  typeof BlogPost.prototype.id,
  BlogPostRelations
> {
  constructor(@inject('datasources.valiarian') dataSource: ValiarianDataSource) {
    super(BlogPost, dataSource);
  }
}
