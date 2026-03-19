import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  response
} from '@loopback/rest';
import {Product} from '../models';
import {ProductRepository} from '../repositories';

export class PublicProductController {
  constructor(
    @repository(ProductRepository)
    public productRepository: ProductRepository,
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
    const products = await this.productRepository.findNewArrivals(limit, offset);

    const total = await this.productRepository.count({
      isNewArrival: true,
      status: 'published',
      inStock: true,
    });

    return {
      products,
      total: total.count,
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
    const products = await this.productRepository.findBestSellers(limit, offset);

    const total = await this.productRepository.count({
      isBestSeller: true,
      status: 'published',
      inStock: true,
    });

    return {
      products,
      total: total.count,
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
    const products = await this.productRepository.findFeatured(limit, offset);

    const total = await this.productRepository.count({
      isFeatured: true,
      status: 'published',
      inStock: true,
    });

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
    @param.query.number('limit') limit = 20,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    const result = await this.productRepository.searchProducts({
      search,
      status: 'published',
      inStock,
      minPrice,
      maxPrice,
      categoryId,
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
