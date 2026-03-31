import {Constructor, Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  Filter,
  Where,
  repository,
} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Category, Product, ProductRelations, ProductVariant} from '../models';
import {CategoryRepository} from './category.repository';
import {ProductVariantRepository} from './product-variant.repository';

export interface ProductSearchOptions {
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  saleOnly?: boolean;
  inStock?: boolean;
  categoryId?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  skip?: number;
  order?: string[];
}

export interface PaginatedProductResult {
  data: Product[];
  total: number;
  limit: number;
  skip: number;
}

export class ProductRepository extends TimeStampRepositoryMixin<
  Product,
  typeof Product.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Product,
      typeof Product.prototype.id,
      ProductRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly category: BelongsToAccessor<
    Category,
    typeof Product.prototype.id
  >;

  private hasSuccessfulAtomicUpdate(result: any): boolean {
    if (Array.isArray(result)) {
      return result.length === 1;
    }

    if (Array.isArray(result?.rows)) {
      return result.rows.length === 1;
    }

    return (result?.affectedRows || result?.count || 0) === 1;
  }

  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
    @repository.getter('CategoryRepository')
    protected categoryRepositoryGetter: Getter<CategoryRepository>,
    @repository.getter('ProductVariantRepository') protected productVariantRepositoryGetter: Getter<ProductVariantRepository>,
  ) {
    super(Product, dataSource);
    this.category = this.createBelongsToAccessorFor(
      'category',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver('category', this.category.inclusionResolver);
  }

  /**
   * Sync total stock quantity from variants
   */
  async syncStockFromVariants(
    productId: string,
    options?: {transaction?: any},
  ): Promise<Product> {
    const variantRepo = await this.productVariantRepositoryGetter();
    const variants = await variantRepo.find({where: {productId}}, options);
    const totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

    await this.updateById(productId, {
      stockQuantity: totalStock,
      inStock: totalStock > 0,
      updatedAt: new Date(),
    }, options);

    return this.findById(productId, undefined, options);
  }

  /**
   * Find new arrival products
   */
  async findNewArrivals(limit = 10, offset = 0): Promise<Product[]> {
    const now = new Date();

    return this.find({
      where: {
        isNewArrival: true,
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
        or: [
          {newArrivalEndDate: {gt: now}},
          {newArrivalEndDate: null},
        ],
      } as any,
      order: ['createdAt DESC'],
      limit,
      skip: offset,
    });
  }

  /**
   * Find best seller products
   */
  async findBestSellers(limit = 10, offset = 0): Promise<Product[]> {
    return this.find({
      where: {
        isBestSeller: true,
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
      },
      order: ['soldCount DESC', 'createdAt DESC'],
      limit,
      skip: offset,
    });
  }

  /**
   * Find featured products
   */
  async findFeatured(limit = 10, offset = 0): Promise<Product[]> {
    return this.find({
      where: {
        isFeatured: true,
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
      },
      order: ['createdAt DESC'],
      limit,
      skip: offset,
    });
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string): Promise<Product | null> {
    const products = await this.find({
      where: {slug},
      limit: 1,
    });
    return products.length > 0 ? products[0] : null;
  }

  /**
   * Update stock quantity for a product
   */
  async updateStock(
    id: string,
    quantity: number,
    options?: {transaction?: any},
  ): Promise<Product> {
    const product = await this.findById(id, undefined, options);
    product.stockQuantity = quantity;
    product.inStock = quantity > 0;
    product.updatedAt = new Date();
    await this.update(product, options);
    return product;
  }

  /**
   * Use a single conditional UPDATE so stock reservation is decided by the
   * database in one step. A separate read-then-write can oversell under load.
   */
  async reserveProductStockAtomic(
    productId: string,
    quantity: number,
    options?: {transaction?: any},
  ): Promise<boolean> {
    const sql = `
      UPDATE public.products
      SET stockquantity = stockquantity - $1,
          instock = GREATEST(stockquantity - $1, 0) > 0,
          updatedat = NOW()
      WHERE id = $2
        AND (COALESCE(trackinventory, true) = false OR stockquantity >= $1)
      RETURNING id;
    `;

    const result = await this.dataSource.execute(sql, [quantity, productId], options);
    const reserved = this.hasSuccessfulAtomicUpdate(result);

    if (!reserved) {
      console.warn('[Inventory] Atomic product reservation failed', {
        productId,
        requestedQty: quantity,
      });
    }

    return reserved;
  }

  async releaseProductStockAtomic(
    productId: string,
    quantity: number,
    options?: {transaction?: any},
  ): Promise<boolean> {
    const sql = `
      UPDATE public.products
      SET stockquantity = stockquantity + $1,
          instock = (stockquantity + $1) > 0,
          updatedat = NOW()
      WHERE id = $2
      RETURNING id;
    `;

    const result = await this.dataSource.execute(sql, [quantity, productId], options);
    return this.hasSuccessfulAtomicUpdate(result);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<Product> {
    const product = await this.findById(id);
    product.viewCount = (product.viewCount || 0) + 1;
    product.updatedAt = new Date();
    await this.update(product);
    return product;
  }

  /**
   * Search products
   */
  async searchProducts(options: ProductSearchOptions): Promise<PaginatedProductResult> {
    const {
      search,
      status,
      isNewArrival,
      isBestSeller,
      isFeatured,
      saleOnly,
      inStock,
      categoryId,
      tags,
      minPrice,
      maxPrice,
      limit = 50,
      skip = 0,
      order = ['createdAt DESC'],
    } = options;

    const andConditions: Where<Product>[] = [];

    if (search) {
      andConditions.push({
        or: [
          {name: {ilike: `%${search}%`}},
          {description: {ilike: `%${search}%`}},
          {shortDescription: {ilike: `%${search}%`}},
          {sku: {ilike: `%${search}%`}},
        ],
      } as any);
    }

    if (status) andConditions.push({status});
    if (isNewArrival !== undefined) andConditions.push({isNewArrival});
    if (isBestSeller !== undefined) andConditions.push({isBestSeller});
    if (isFeatured !== undefined) andConditions.push({isFeatured});
    if (saleOnly) {
      const now = new Date();

      andConditions.push({
        and: [
          {salePrice: {gt: 0}},
          {
            or: [
              {saleStartDate: null},
              {saleStartDate: {lte: now}},
            ],
          },
          {
            or: [
              {saleEndDate: null},
              {saleEndDate: {gte: now}},
            ],
          },
        ],
      } as any);
    }
    if (inStock !== undefined) andConditions.push({inStock});
    if (categoryId) {
      // Use the model's property name, LoopBack should map it to column name
      // but let's ensure it's a clean property assignment.
      andConditions.push({categoryId: categoryId} as any);
    }
    if (minPrice !== undefined) andConditions.push({price: {gte: minPrice}} as any);
    if (maxPrice !== undefined) andConditions.push({price: {lte: maxPrice}} as any);

    const where: Where<Product> = andConditions.length > 1
      ? {and: andConditions} as any
      : (andConditions.length === 1 ? andConditions[0] : {});

    const filter: Filter<Product> = {
      where: Object.keys(where).length > 0 ? where : undefined,
      include: [{relation: 'category'}],
      limit,
      skip,
      order,
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

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    const products = await this.find({
      where: {isDeleted: false},
      include: [{relation: 'category'}],
    });

    const categories = new Set<string>();
    products.forEach(product => {
      const category = (product as ProductRelations & Product).category;
      if (category?.name) {
        categories.add(category.name);
      }
    });

    return [...categories].sort();
  }

  /**
   * Get all unique tags
   */
  async getTags(): Promise<string[]> {
    const products = await this.find({
      fields: {tags: true},
    });

    const tags = new Set<string>();
    products.forEach(p => {
      if (p.tags) {
        p.tags.forEach(tag => tags.add(tag));
      }
    });

    return Array.from(tags).sort();
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const where: Where<Product> = excludeId
      ? {slug, id: {neq: excludeId}} as any
      : {slug};

    const count = await this.count(where);
    return count.count > 0;
  }

  /**
   * Get a specific variant from a product
   */
  async getVariant(productId: string, variantId: string): Promise<ProductVariant | null> {
    const variantRepo = await this.productVariantRepositoryGetter();
    const variants = await variantRepo.find({
      where: {productId, id: variantId},
    });
    return variants.length > 0 ? variants[0] : null;
  }

  /**
   * Update stock quantity for a specific variant and sync product stock
   */
  async updateVariantStock(
    productId: string,
    variantId: string,
    quantity: number,
    options?: {transaction?: any},
  ): Promise<Product> {
    const variantRepo = await this.productVariantRepositoryGetter();
    await variantRepo.updateById(variantId, {
      stockQuantity: quantity,
      inStock: quantity > 0,
      updatedAt: new Date(),
    }, options);

    return this.syncStockFromVariants(productId, options);
  }

  /**
   * Variants need the same single-statement reservation guarantee as products.
   * Transactions alone are not enough if the stock check happens before update.
   */
  async reserveVariantStockAtomic(
    productId: string,
    variantId: string,
    quantity: number,
    options?: {transaction?: any},
  ): Promise<boolean> {
    const variantSql = `
      UPDATE public.product_variants
      SET stockquantity = stockquantity - $1,
          instock = GREATEST(stockquantity - $1, 0) > 0,
          updatedat = NOW()
      WHERE id = $2
        AND productid = $3
        AND stockquantity >= $1
      RETURNING id;
    `;

    const variantResult = await this.dataSource.execute(
      variantSql,
      [quantity, variantId, productId],
      options,
    );

    const reservedVariant = this.hasSuccessfulAtomicUpdate(variantResult);

    if (reservedVariant) {
      await this.syncStockFromVariants(productId, options);
      return true;
    }

    const embeddedSql = `
      WITH matched AS (
        SELECT
          ordinality - 1 AS idx,
          COALESCE((variant.value ->> 'stockQuantity')::integer, 0) AS stock_qty
        FROM public.products,
             jsonb_array_elements(COALESCE(variants, '[]'::jsonb)) WITH ORDINALITY AS variant(value, ordinality)
        WHERE id = $1
          AND variant.value ->> 'id' = $2
        LIMIT 1
      )
      UPDATE public.products
      SET variants = jsonb_set(
            COALESCE(variants, '[]'::jsonb),
            ARRAY[(SELECT idx::text FROM matched), 'stockQuantity'],
            to_jsonb((SELECT stock_qty - $3 FROM matched)),
            false
          ),
          stockquantity = GREATEST(COALESCE(stockquantity, 0) - $3, 0),
          instock = GREATEST(COALESCE(stockquantity, 0) - $3, 0) > 0,
          updatedat = NOW()
      WHERE id = $1
        AND EXISTS (
          SELECT 1
          FROM matched
          WHERE stock_qty >= $3
        )
      RETURNING id;
    `;

    const embeddedResult = await this.dataSource.execute(
      embeddedSql,
      [productId, variantId, quantity],
      options,
    );

    const reservedEmbedded = this.hasSuccessfulAtomicUpdate(embeddedResult);

    if (!reservedEmbedded) {
      console.warn('[Inventory] Atomic variant reservation failed', {
        productId,
        variantId,
        requestedQty: quantity,
      });
    }

    return reservedEmbedded;
  }

  async releaseVariantStockAtomic(
    productId: string,
    variantId: string,
    quantity: number,
    options?: {transaction?: any},
  ): Promise<boolean> {
    const variantSql = `
      UPDATE public.product_variants
      SET stockquantity = stockquantity + $1,
          instock = (stockquantity + $1) > 0,
          updatedat = NOW()
      WHERE id = $2
        AND productid = $3
      RETURNING id;
    `;

    const variantResult = await this.dataSource.execute(
      variantSql,
      [quantity, variantId, productId],
      options,
    );

    const releasedVariant = this.hasSuccessfulAtomicUpdate(variantResult);

    if (releasedVariant) {
      await this.syncStockFromVariants(productId, options);
      return true;
    }

    const embeddedSql = `
      WITH matched AS (
        SELECT
          ordinality - 1 AS idx,
          COALESCE((variant.value ->> 'stockQuantity')::integer, 0) AS stock_qty
        FROM public.products,
             jsonb_array_elements(COALESCE(variants, '[]'::jsonb)) WITH ORDINALITY AS variant(value, ordinality)
        WHERE id = $1
          AND variant.value ->> 'id' = $2
        LIMIT 1
      )
      UPDATE public.products
      SET variants = jsonb_set(
            COALESCE(variants, '[]'::jsonb),
            ARRAY[(SELECT idx::text FROM matched), 'stockQuantity'],
            to_jsonb((SELECT stock_qty + $3 FROM matched)),
            false
          ),
          stockquantity = COALESCE(stockquantity, 0) + $3,
          instock = (COALESCE(stockquantity, 0) + $3) > 0,
          updatedat = NOW()
      WHERE id = $1
        AND EXISTS (SELECT 1 FROM matched)
      RETURNING id;
    `;

    const embeddedResult = await this.dataSource.execute(
      embeddedSql,
      [productId, variantId, quantity],
      options,
    );

    return this.hasSuccessfulAtomicUpdate(embeddedResult);
  }

  async variantCombinationExists(
    productId: string,
    color: string,
    size: string,
    excludeVariantId?: string
  ): Promise<boolean> {
    const variantRepo = await this.productVariantRepositoryGetter();
    const where: any = {
      productId,
      color,
      size,
    };
    if (excludeVariantId) {
      where.id = {neq: excludeVariantId};
    }
    const count = await variantRepo.count(where);
    return count.count > 0;
  }
}
