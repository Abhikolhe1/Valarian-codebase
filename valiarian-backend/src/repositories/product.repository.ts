import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository, Filter, Where} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {Product, ProductRelations, ProductVariant} from '../models';

export interface ProductSearchOptions {
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  categories?: string[];
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
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(Product, dataSource);
  }

  /**
   * Find new arrival products
   * @param limit - Maximum number of results (default: 10)
   * @param offset - Number of results to skip (default: 0)
   * @returns Array of new arrival products
   */
  async findNewArrivals(limit = 10, offset = 0): Promise<Product[]> {
    const now = new Date();

    return this.find({
      where: {
        isNewArrival: true,
        status: 'published',
        inStock: true,
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
   * @param limit - Maximum number of results (default: 10)
   * @param offset - Number of results to skip (default: 0)
   * @returns Array of best seller products
   */
  async findBestSellers(limit = 10, offset = 0): Promise<Product[]> {
    return this.find({
      where: {
        isBestSeller: true,
        status: 'published',
        inStock: true,
      },
      order: ['soldCount DESC', 'createdAt DESC'],
      limit,
      skip: offset,
    });
  }

  /**
   * Find featured products
   * @param limit - Maximum number of results (default: 10)
   * @param offset - Number of results to skip (default: 0)
   * @returns Array of featured products
   */
  async findFeatured(limit = 10, offset = 0): Promise<Product[]> {
    return this.find({
      where: {
        isFeatured: true,
        status: 'published',
        inStock: true,
      },
      order: ['createdAt DESC'],
      limit,
      skip: offset,
    });
  }

  /**
   * Find product by slug
   * @param slug - The product slug
   * @returns Product or null if not found
   */
  async findBySlug(slug: string): Promise<Product | null> {
    const products = await this.find({
      where: {slug},
      limit: 1,
    });
    return products.length > 0 ? products[0] : null;
  }

  /**
   * Find published products with optional filters
   * @param filter - Optional filter criteria
   * @returns Array of published products
   */
  async findPublished(filter?: Filter<Product>): Promise<Product[]> {
    const where: Where<Product> = {
      ...filter?.where,
      status: 'published',
    } as any;

    return this.find({
      ...filter,
      where,
    });
  }

  /**
   * Update stock quantity for a product
   * @param id - Product ID
   * @param quantity - New stock quantity
   * @returns Updated product
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
   * Increment view count for a product
   * @param id - Product ID
   * @returns Updated product
   */
  async incrementViewCount(id: string): Promise<Product> {
    const product = await this.findById(id);

    product.viewCount = (product.viewCount || 0) + 1;
    product.updatedAt = new Date();

    await this.update(product);
    return product;
  }

  /**
   * Increment sold count for a product
   * @param id - Product ID
   * @param quantity - Number of items sold (default: 1)
   * @returns Updated product
   */
  async incrementSoldCount(id: string, quantity = 1): Promise<Product> {
    const product = await this.findById(id);

    product.soldCount = (product.soldCount || 0) + quantity;
    product.updatedAt = new Date();

    await this.update(product);
    return product;
  }

  /**
   * Search products with advanced filtering and pagination
   * @param options - Search and filter options
   * @returns Paginated product results
   */
  async searchProducts(options: ProductSearchOptions): Promise<PaginatedProductResult> {
    const {
      search,
      status,
      isNewArrival,
      isBestSeller,
      isFeatured,
      inStock,
      categories,
      tags,
      minPrice,
      maxPrice,
      limit = 50,
      skip = 0,
      order = ['createdAt DESC'],
    } = options;

    const andConditions: Where<Product>[] = [];

    // Search by name, description, or SKU
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

    // Filter by status
    if (status) {
      andConditions.push({status});
    }

    // Filter by labels
    if (isNewArrival !== undefined) {
      andConditions.push({isNewArrival});
    }

    if (isBestSeller !== undefined) {
      andConditions.push({isBestSeller});
    }

    if (isFeatured !== undefined) {
      andConditions.push({isFeatured});
    }

    // Filter by stock status
    if (inStock !== undefined) {
      andConditions.push({inStock});
    }

    // Filter by price range
    if (minPrice !== undefined) {
      andConditions.push({price: {gte: minPrice}} as any);
    }

    if (maxPrice !== undefined) {
      andConditions.push({price: {lte: maxPrice}} as any);
    }

    // Filter by categories (product must have at least one of the specified categories)
    if (categories && categories.length > 0) {
      // This is a simplified approach - in production, you might want to use a more sophisticated query
      andConditions.push({
        or: categories.map(cat => ({
          categories: {like: `%${cat}%`} as any,
        })),
      } as any);
    }

    // Filter by tags (product must have at least one of the specified tags)
    if (tags && tags.length > 0) {
      andConditions.push({
        or: tags.map(tag => ({
          tags: {like: `%${tag}%`} as any,
        })),
      } as any);
    }

    // Build the where clause
    const where: Where<Product> = andConditions.length > 0
      ? {and: andConditions} as any
      : {};

    const filter: Filter<Product> = {
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      skip,
      order,
    };

    // Get total count for pagination
    const total = await this.count(filter.where);

    // Get paginated results
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
   * @returns Array of unique categories
   */
  async getCategories(): Promise<string[]> {
    const products = await this.find({
      fields: {categories: true},
    });

    const categories = new Set<string>();
    products.forEach(p => {
      if (p.categories) {
        p.categories.forEach(cat => categories.add(cat));
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Get all unique tags
   * @returns Array of unique tags
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
   * Get product statistics
   * @returns Object with product statistics
   */
  async getProductStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    newArrivals: number;
    bestSellers: number;
    featured: number;
    outOfStock: number;
  }> {
    const [
      total,
      published,
      draft,
      archived,
      newArrivals,
      bestSellers,
      featured,
      outOfStock,
    ] = await Promise.all([
      this.count(),
      this.count({status: 'published'}),
      this.count({status: 'draft'}),
      this.count({status: 'archived'}),
      this.count({isNewArrival: true, status: 'published'}),
      this.count({isBestSeller: true, status: 'published'}),
      this.count({isFeatured: true, status: 'published'}),
      this.count({inStock: false}),
    ]);

    return {
      total: total.count,
      published: published.count,
      draft: draft.count,
      archived: archived.count,
      newArrivals: newArrivals.count,
      bestSellers: bestSellers.count,
      featured: featured.count,
      outOfStock: outOfStock.count,
    };
  }

  /**
   * Check if slug exists (excluding a specific product ID)
   * @param slug - The slug to check
   * @param excludeId - Optional product ID to exclude from check
   * @returns True if slug exists, false otherwise
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const where: Where<Product> = excludeId
      ? {slug, id: {neq: excludeId}} as any
      : {slug};

    const count = await this.count(where);
    return count.count > 0;
  }

  // ==================== VARIANT MANAGEMENT METHODS ====================

  /**
   * Get a specific variant from a product
   * @param productId - Product ID
   * @param variantId - Variant ID
   * @returns ProductVariant or null if not found
   */
  async getVariant(productId: string, variantId: string): Promise<ProductVariant | null> {
    const product = await this.findById(productId);
    if (!product.variants || product.variants.length === 0) {
      return null;
    }
    return product.variants.find(v => v.id === variantId) || null;
  }

  /**
   * Update stock quantity for a specific variant
   * @param productId - Product ID
   * @param variantId - Variant ID
   * @param quantity - New stock quantity
   * @returns Updated product
   */
  async updateVariantStock(
    productId: string,
    variantId: string,
    quantity: number
  ): Promise<Product> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      throw new Error('Product has no variants');
    }

    const variantIndex = product.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
      throw new Error(`Variant with ID ${variantId} not found`);
    }

    product.variants[variantIndex].stockQuantity = quantity;
    product.variants[variantIndex].inStock = quantity > 0;

    // Update total stock quantity (sum of all variants)
    product.stockQuantity = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    product.inStock = product.stockQuantity > 0;
    product.updatedAt = new Date();

    await this.updateById(productId, {
      variants: product.variants,
      stockQuantity: product.stockQuantity,
      inStock: product.inStock,
      updatedAt: product.updatedAt,
    });

    return this.findById(productId);
  }

  /**
   * Get total stock across all variants
   * @param productId - Product ID
   * @returns Total stock quantity
   */
  async getTotalStock(productId: string): Promise<number> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return product.stockQuantity || 0;
    }

    return product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  }

  /**
   * Get all variants for a specific color
   * @param productId - Product ID
   * @param color - Color hex code
   * @returns Array of variants with the specified color
   */
  async getVariantsByColor(productId: string, color: string): Promise<ProductVariant[]> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    return product.variants.filter(v => v.color === color);
  }

  /**
   * Get all variants for a specific size
   * @param productId - Product ID
   * @param size - Size (S, M, L, XL, etc.)
   * @returns Array of variants with the specified size
   */
  async getVariantsBySize(productId: string, size: string): Promise<ProductVariant[]> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    return product.variants.filter(v => v.size === size);
  }

  /**
   * Check if a specific variant is available (in stock)
   * @param productId - Product ID
   * @param variantId - Variant ID
   * @returns True if variant is in stock, false otherwise
   */
  async checkVariantAvailability(productId: string, variantId: string): Promise<boolean> {
    const variant = await this.getVariant(productId, variantId);

    if (!variant) {
      return false;
    }

    return variant.inStock && variant.stockQuantity > 0;
  }

  /**
   * Get the default variant for a product
   * @param productId - Product ID
   * @returns Default variant or first variant if no default is set
   */
  async getDefaultVariant(productId: string): Promise<ProductVariant | null> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return null;
    }

    const defaultVariant = product.variants.find(v => v.isDefault);
    return defaultVariant || product.variants[0];
  }

  /**
   * Get all available colors for a product
   * @param productId - Product ID
   * @returns Array of unique colors with their names
   */
  async getAvailableColors(productId: string): Promise<Array<{color: string; colorName: string}>> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    const colorMap = new Map<string, string>();
    product.variants.forEach(v => {
      if (!colorMap.has(v.color)) {
        colorMap.set(v.color, v.colorName);
      }
    });

    return Array.from(colorMap.entries()).map(([color, colorName]) => ({
      color,
      colorName,
    }));
  }

  /**
   * Get all available sizes for a product
   * @param productId - Product ID
   * @returns Array of unique sizes
   */
  async getAvailableSizes(productId: string): Promise<string[]> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    const sizes = new Set<string>();
    product.variants.forEach(v => sizes.add(v.size));

    return Array.from(sizes);
  }

  /**
   * Find variant by color and size combination
   * @param productId - Product ID
   * @param color - Color hex code
   * @param size - Size
   * @returns Variant or null if not found
   */
  async findVariantByColorAndSize(
    productId: string,
    color: string,
    size: string
  ): Promise<ProductVariant | null> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return null;
    }

    return product.variants.find(v => v.color === color && v.size === size) || null;
  }

  /**
   * Check if a color+size combination already exists
   * @param productId - Product ID
   * @param color - Color hex code
   * @param size - Size
   * @param excludeVariantId - Optional variant ID to exclude from check
   * @returns True if combination exists, false otherwise
   */
  async variantCombinationExists(
    productId: string,
    color: string,
    size: string,
    excludeVariantId?: string
  ): Promise<boolean> {
    const product = await this.findById(productId);

    if (!product.variants || product.variants.length === 0) {
      return false;
    }

    return product.variants.some(
      v => v.color === color && v.size === size && v.id !== excludeVariantId
    );
  }
}
