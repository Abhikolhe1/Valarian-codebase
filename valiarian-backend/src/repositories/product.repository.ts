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
  async syncStockFromVariants(productId: string): Promise<Product> {
    const variantRepo = await this.productVariantRepositoryGetter();
    const variants = await variantRepo.find({where: {productId}});
    const totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    
    await this.updateById(productId, {
      stockQuantity: totalStock,
      inStock: totalStock > 0,
      updatedAt: new Date(),
    });

    return this.findById(productId);
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
  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findById(id);
    product.stockQuantity = quantity;
    product.inStock = quantity > 0;
    product.updatedAt = new Date();
    await this.update(product);
    return product;
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
    if (inStock !== undefined) andConditions.push({inStock});
    if (categoryId) andConditions.push({categoryId});
    if (minPrice !== undefined) andConditions.push({price: {gte: minPrice}} as any);
    if (maxPrice !== undefined) andConditions.push({price: {lte: maxPrice}} as any);

    const where: Where<Product> = andConditions.length > 0 ? {and: andConditions} as any : {};

    const filter: Filter<Product> = {
      where: Object.keys(where).length > 0 ? where : undefined,
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
    quantity: number
  ): Promise<Product> {
    const variantRepo = await this.productVariantRepositoryGetter();
    await variantRepo.updateById(variantId, {
      stockQuantity: quantity,
      inStock: quantity > 0,
      updatedAt: new Date(),
    });

    return this.syncStockFromVariants(productId);
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
