import {Constructor, Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DataObject,
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  Options,
  repository,
} from '@loopback/repository';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ValiarianDataSource} from '../datasources';
import {
  Category,
  CategoryRelations,
  ParentCategory,
  Product,
} from '../models';
import {ParentCategoryRepository} from './parent-category.repository';
import {ProductRepository} from './product.repository';
import {sanitizeUuid} from '../utils/validation.utils';

export class CategoryRepository extends TimeStampRepositoryMixin<
  Category,
  typeof Category.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Category,
      typeof Category.prototype.id,
      CategoryRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly parentCategory: BelongsToAccessor<
    ParentCategory,
    typeof Category.prototype.id
  >;
  public readonly products: HasManyRepositoryFactory<
    Product,
    typeof Category.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('ParentCategoryRepository')
    protected parentCategoryRepositoryGetter: Getter<ParentCategoryRepository>,
    @repository.getter('ProductRepository')
    protected productRepositoryGetter: Getter<ProductRepository>,
  ) {
    super(Category, dataSource);
    this.parentCategory = this.createBelongsToAccessorFor(
      'parentCategory',
      parentCategoryRepositoryGetter,
    );
    this.registerInclusionResolver(
      'parentCategory',
      this.parentCategory.inclusionResolver,
    );
    this.products = this.createHasManyRepositoryFactoryFor(
      'products',
      productRepositoryGetter,
    );
    this.registerInclusionResolver('products', this.products.inclusionResolver);
  }

  async create(entity: DataObject<Category>, options?: Options): Promise<Category> {
    return super.create(this.normalizeParentCategoryId(entity), options);
  }

  async updateById(
    id: typeof Category.prototype.id,
    data: DataObject<Category>,
    options?: Options,
  ): Promise<void> {
    return super.updateById(id, this.normalizeParentCategoryId(data), options);
  }

  private normalizeParentCategoryId<T extends DataObject<Category>>(data: T): T {
    if (!Object.prototype.hasOwnProperty.call(data, 'parentCategoryId')) {
      return data;
    }

    return {
      ...data,
      parentCategoryId: sanitizeUuid(data.parentCategoryId),
    };
  }
}
