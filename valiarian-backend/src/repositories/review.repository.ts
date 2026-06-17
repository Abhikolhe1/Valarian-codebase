import {Constructor, Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  repository,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Product, Review, ReviewRelations, Users} from '../models';
import {ProductRepository} from './product.repository';
import {UsersRepository} from './users.repository';

export class ReviewRepository extends TimeStampRepositoryMixin<
  Review,
  typeof Review.prototype.id,
  Constructor<DefaultCrudRepository<Review, typeof Review.prototype.id, ReviewRelations>>
>(DefaultCrudRepository) {
  public readonly product: BelongsToAccessor<Product, typeof Review.prototype.id>;
  public readonly user: BelongsToAccessor<Users, typeof Review.prototype.id>;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('ProductRepository')
    protected productRepositoryGetter: Getter<ProductRepository>,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Review, dataSource);
    this.product = this.createBelongsToAccessorFor('product', productRepositoryGetter);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}
