import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository, Filter, Where} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Coupon, CouponRelations} from '../models';

export interface CouponSearchOptions {
  search?: string;
  isActive?: boolean;
  limit?: number;
  skip?: number;
  order?: string[];
}

export interface PaginatedCouponResult {
  data: Coupon[];
  total: number;
  limit: number;
  skip: number;
}

export class CouponRepository extends TimeStampRepositoryMixin<
  Coupon,
  typeof Coupon.prototype.id,
  Constructor<
    DefaultCrudRepository<Coupon, typeof Coupon.prototype.id, CouponRelations>
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.valiarian') dataSource: ValiarianDataSource) {
    super(Coupon, dataSource);
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const coupons = await this.find({
      where: {
        code,
        isDeleted: false,
      },
      limit: 1,
    });

    return coupons[0] || null;
  }

  async searchCoupons(options: CouponSearchOptions): Promise<PaginatedCouponResult> {
    const {
      search,
      isActive,
      limit = 20,
      skip = 0,
      order = ['createdAt DESC'],
    } = options;

    const andConditions: Where<Coupon>[] = [{isDeleted: false} as Where<Coupon>];

    if (typeof isActive === 'boolean') {
      andConditions.push({isActive} as Where<Coupon>);
    }

    if (search) {
      andConditions.push({
        or: [
          {code: {ilike: `%${search}%`}},
          {title: {ilike: `%${search}%`}},
        ],
      } as unknown as Where<Coupon>);
    }

    const where: Where<Coupon> =
      andConditions.length > 0 ? ({and: andConditions} as Where<Coupon>) : {};

    const filter: Filter<Coupon> = {
      where,
      limit,
      skip,
      order,
    };

    const total = await this.count(where);
    const data = await this.find(filter);

    return {
      data,
      total: total.count,
      limit,
      skip,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.updateById(id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
