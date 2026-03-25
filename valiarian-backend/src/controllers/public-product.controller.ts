import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  response
} from '@loopback/rest';
import {Product} from '../models';
import {CategoryRepository, ProductRepository} from '../repositories';
import {isValidUuid} from '../utils/validation.utils';

export class PublicProductController {
  constructor(
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
  ) { }

  @get('/api/public/products/new-arrivals')
  @response(200, {
    description: 'New arrival products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: getModelSchemaRef(Product),
            },
            total: {type: 'number'},
          },
        },
      },
    },
  })
  async getNewArrivals(
    @param.query.number('limit') limit = 10,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    const now = new Date();

    console.log(`Fetching New Arrivals: limit=${limit}, offset=${offset}, now=${now.toISOString()}`);

    // First try to find products explicitly marked as new arrivals
    let products = await this.productRepository.find({
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

    let total = 0;

    if (products.length > 0) {
      const count = await this.productRepository.count({
        isNewArrival: true,
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
        or: [
          {newArrivalEndDate: {gt: now}},
          {newArrivalEndDate: null},
        ],
      } as any);
      total = count.count;
    } else {
      console.log('No explicit new arrivals found, falling back to latest published products');
      // Fallback: Fetch latest published products
      products = await this.productRepository.find({
        where: {
          status: 'published',
          inStock: true,
          isActive: true,
          isDeleted: false,
        },
        order: ['createdAt DESC'],
        limit,
        skip: offset,
      });
      const count = await this.productRepository.count({
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
      });
      total = count.count;
    }

    console.log(`New Arrivals found: ${products.length}, total: ${total}`);

    return {
      products,
      total,
    };
  }

  @get('/api/public/products/best-sellers')
  @response(200, {
    description: 'Best seller products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: getModelSchemaRef(Product),
            },
            total: {type: 'number'},
          },
        },
      },
    },
  })
  async getBestSellers(
    @param.query.number('limit') limit = 10,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    console.log(`Fetching Best Sellers: limit=${limit}, offset=${offset}`);

    // First try to find products explicitly marked as best sellers
    let products = await this.productRepository.find({
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

    let total = 0;

    if (products.length > 0) {
      const count = await this.productRepository.count({
        isBestSeller: true,
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
      });
      total = count.count;
    } else {
      console.log('No explicit best sellers found, falling back to highest soldCount');
      // Fallback: Fetch products with highest soldCount
      products = await this.productRepository.find({
        where: {
          status: 'published',
          inStock: true,
          isActive: true,
          isDeleted: false,
          soldCount: {gt: 0} as any,
        },
        order: ['soldCount DESC', 'createdAt DESC'],
        limit,
        skip: offset,
      });
      const count = await this.productRepository.count({
        status: 'published',
        inStock: true,
        isActive: true,
        isDeleted: false,
        soldCount: {gt: 0} as any,
      });
      total = count.count;
    }

    console.log(`Best Sellers found: ${products.length}, total: ${total}`);

    return {
      products,
      total,
    };
  }

  @get('/api/public/products/featured')
  @response(200, {
    description: 'Featured products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: getModelSchemaRef(Product),
            },
            total: {type: 'number'},
          },
        },
      },
    },
  })
  async getFeatured(
    @param.query.number('limit') limit = 10,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    console.log(`Fetching Featured Products: limit=${limit}, offset=${offset}`);

    const products = await this.productRepository.findFeatured(limit, offset);

    const total = await this.productRepository.count({
      isFeatured: true,
      status: 'published',
      inStock: true,
      isActive: true,
      isDeleted: false,
    });

    console.log(`Featured Products found: ${products.length}, total: ${total.count}`);

    return {
      products,
      total: total.count,
    };
  }

  @get('/api/public/products/categories')
  @response(200, {
    description: 'List of all product categories',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async getCategories(): Promise<{categories: string[]}> {
    const categories = await this.productRepository.getCategories();
    return {categories};
  }

  @get('/api/public/products/tags')
  @response(200, {
    description: 'List of all product tags',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async getTags(): Promise<{tags: string[]}> {
    const tags = await this.productRepository.getTags();
    return {tags};
  }

  @get('/api/public/products')
  @response(200, {
    description: 'Array of published products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: getModelSchemaRef(Product),
            },
            total: {type: 'number'},
          },
        },
      },
    },
  })
  async find(
    @param.query.string('search') search?: string,
    @param.query.boolean('inStock') inStock?: boolean,
    @param.query.number('minPrice') minPrice?: number,
    @param.query.number('maxPrice') maxPrice?: number,
    @param.query.string('categoryId') categoryId?: string,
    @param.query.string('categorySlug') categorySlug?: string,
    @param.query.number('limit') limit = 20,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    let resolvedCategoryId = categoryId;

    // Backward compatibility: if frontend sends a slug in categoryId, resolve it here.
    if (resolvedCategoryId && !isValidUuid(resolvedCategoryId)) {
      categorySlug = resolvedCategoryId;
      resolvedCategoryId = undefined;
    }

    if (categorySlug && !resolvedCategoryId) {
      const matchedCategory = await this.categoryRepository.findOne({
        where: {
          slug: categorySlug,
          isActive: true,
          isDeleted: false,
        },
      });

      if (!matchedCategory) {
        return {
          products: [],
          total: 0,
        };
      }

      resolvedCategoryId = matchedCategory.id;
    }

    const result = await this.productRepository.searchProducts({
      search,
      status: 'published',
      inStock,
      minPrice,
      maxPrice,
      categoryId: resolvedCategoryId,
      limit,
      skip: offset,
    });

    return {
      products: result.data,
      total: result.total,
    };
  }

  @get('/api/public/products/{slug}')
  @response(200, {
    description: 'Product model instance by slug',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async findBySlug(@param.path.string('slug') slug: string): Promise<Product> {
    const product = await this.productRepository.findBySlug(slug);

    if (!product) {
      throw new HttpErrors.NotFound(`Product with slug "${slug}" not found`);
    }

    if (product.status !== 'published') {
      throw new HttpErrors.NotFound(`Product with slug "${slug}" not found`);
    }

    // Increment view count
    await this.productRepository.incrementViewCount(product.id);

    return product;
  }
}
