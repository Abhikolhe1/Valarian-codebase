import {Constructor, Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {
  PremiumPreorder,
  PremiumPreorderRelations,
  Product,
  Users,
} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {ProductRepository} from './product.repository';
import {UsersRepository} from './users.repository';

export interface PremiumPreorderSearchOptions {
  search?: string;
  status?: string;
  paymentStatus?: string;
  userId?: string;
  limit?: number;
  skip?: number;
  order?: string[];
}

export interface PaginatedPremiumPreorderResult {
  data: PremiumPreorder[];
  total: number;
  limit: number;
  skip: number;
}

export class PremiumPreorderRepository extends TimeStampRepositoryMixin<
  PremiumPreorder,
  typeof PremiumPreorder.prototype.id,
  Constructor<
    DefaultCrudRepository<
      PremiumPreorder,
      typeof PremiumPreorder.prototype.id,
      PremiumPreorderRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly user: BelongsToAccessor<
    Users,
    typeof PremiumPreorder.prototype.id
  >;

  public readonly product: BelongsToAccessor<
    Product,
    typeof PremiumPreorder.prototype.id
  >;

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('UsersRepository')
    protected usersRepositoryGetter: Getter<UsersRepository>,
    @repository.getter('ProductRepository')
    protected productRepositoryGetter: Getter<ProductRepository>,
  ) {
    super(PremiumPreorder, dataSource);
    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.product = this.createBelongsToAccessorFor(
      'product',
      productRepositoryGetter,
    );
    this.registerInclusionResolver('user', this.user.inclusionResolver);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
  }

  async generatePreorderNumber(prefix = 'PPR'): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const startOfDay = new Date(year, date.getMonth(), date.getDate());
    const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);

    const todayCount = await this.count({
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      } as any,
    });

    const sequence = String(todayCount.count + 1).padStart(4, '0');
    return `${prefix}-${year}${month}${day}-${sequence}`;
  }

  async findByRazorpayOrderId(
    razorpayOrderId: string,
  ): Promise<PremiumPreorder | null> {
    const orders = await this.find({
      where: {
        razorpayOrderId,
        isDeleted: false,
      },
      limit: 1,
    });

    return orders.length > 0 ? orders[0] : null;
  }

  async searchPremiumPreorders(
    options: PremiumPreorderSearchOptions,
  ): Promise<PaginatedPremiumPreorderResult> {
    const {
      search,
      status,
      paymentStatus,
      userId,
      limit = 20,
      skip = 0,
      order = ['createdAt DESC'],
    } = options;

    const andConditions: Where<PremiumPreorder>[] = [{isDeleted: false}];

    if (search) {
      andConditions.push({
        preorderNumber: {ilike: `%${search}%`},
      } as any);
    }

    if (status) {
      andConditions.push({status} as any);
    }

    if (paymentStatus) {
      andConditions.push({paymentStatus} as any);
    }

    if (userId) {
      andConditions.push({userId});
    }

    const where: Where<PremiumPreorder> =
      andConditions.length > 0 ? ({and: andConditions} as any) : {};

    const filter: Filter<PremiumPreorder> = {
      where,
      limit,
      skip,
      order,
      include: [{relation: 'user'}, {relation: 'product'}],
    };

    const total = await this.count(filter.where);
    const data = await this.find(filter);

    return {
      data,
      total: total.count,
      limit,
      skip,
    };
  }
}
