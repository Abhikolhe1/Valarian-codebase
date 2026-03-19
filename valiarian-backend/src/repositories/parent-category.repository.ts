import {Constructor, Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {
  Category,
  ParentCategory,
  ParentCategoryRelations,
} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {CategoryRepository} from './category.repository';

export class ParentCategoryRepository extends TimeStampRepositoryMixin<
  ParentCategory,
  typeof ParentCategory.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ParentCategory,
      typeof ParentCategory.prototype.id,
      ParentCategoryRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly categories: HasManyRepositoryFactory<
    Category,
    typeof ParentCategory.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
  ) {
    super(ParentCategory, dataSource);
    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'categories',
      this.categories.inclusionResolver,
    );
  }
}
