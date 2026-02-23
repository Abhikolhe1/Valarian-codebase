import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {Product} from '../models';
import {ProductRepository} from '../repositories';
import {SlugService} from '../services/slug.service';

export class ProductController {
  constructor(
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject('services.SlugService')
    public slugService: SlugService,
  ) { }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/products')
  @response(201, {
    description: 'Product created successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async create(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'price'],
            properties: {
              name: {type: 'string', minLength: 1, maxLength: 255},
              slug: {type: 'string'},
              description: {type: 'string'},
              shortDescription: {type: 'string'},
              price: {type: 'number', minimum: 0},
              salePrice: {type: 'number', minimum: 0},
              saleStartDate: {type: 'string', format: 'date-time'},
              saleEndDate: {type: 'string', format: 'date-time'},
              currency: {type: 'string'},
              coverImage: {type: 'string'},
              images: {type: 'array', items: {type: 'string'}},
              colors: {type: 'array', items: {type: 'string'}},
              sizes: {type: 'array', items: {type: 'string'}},
              stockQuantity: {type: 'number'},
              trackInventory: {type: 'boolean'},
              lowStockThreshold: {type: 'number'},
              inStock: {type: 'boolean'},
              isNewArrival: {type: 'boolean'},
              isBestSeller: {type: 'boolean'},
              isFeatured: {type: 'boolean'},
              newArrivalStartDate: {type: 'string', format: 'date-time'},
              newArrivalEndDate: {type: 'string', format: 'date-time'},
              categories: {type: 'array', items: {type: 'string'}},
              tags: {type: 'array', items: {type: 'string'}},
              status: {type: 'string', enum: ['draft', 'published', 'archived']},
              seoTitle: {type: 'string'},
              seoDescription: {type: 'string'},
              seoKeywords: {type: 'array', items: {type: 'string'}},
              sku: {type: 'string'},
            },
          },
        },
      },
    })
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Product> {
    // Generate unique slug if not provided
    if (!productData.slug) {
      productData.slug = await this.slugService.generateUniqueSlug(
        productData.name,
        this.productRepository,
      );
    } else {
      // If slug is provided, ensure it's unique
      const slugExists = await this.productRepository.slugExists(productData.slug);
      if (slugExists) {
        throw new HttpErrors.BadRequest(
          `Product with slug "${productData.slug}" already exists`,
        );
      }
    }

    const now = new Date();
    const product = await this.productRepository.create({
      id: uuidv4(),
      ...productData,
      createdAt: now,
      updatedAt: now,
    });

    return product;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/products')
  @response(200, {
    description: 'Array of Product model instances with pagination',
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
    @param.query.string('status') status?: 'draft' | 'published' | 'archived',
    @param.query.boolean('isNewArrival') isNewArrival?: boolean,
    @param.query.boolean('isBestSeller') isBestSeller?: boolean,
    @param.query.boolean('isFeatured') isFeatured?: boolean,
    @param.query.boolean('inStock') inStock?: boolean,
    @param.query.number('limit') limit = 50,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    const result = await this.productRepository.searchProducts({
      search,
      status,
      isNewArrival,
      isBestSeller,
      isFeatured,
      inStock,
      limit,
      skip: offset,
    });

    return {
      products: result.data,
      total: result.total,
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/products/{id}')
  @response(200, {
    description: 'Product model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }
    return product;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/products/{id}')
  @response(200, {
    description: 'Product updated successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async updateById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: {type: 'string', minLength: 1, maxLength: 255},
              slug: {type: 'string'},
              description: {type: 'string'},
              shortDescription: {type: 'string'},
              price: {type: 'number', minimum: 0},
              salePrice: {type: 'number', minimum: 0},
              saleStartDate: {type: 'string', format: 'date-time'},
              saleEndDate: {type: 'string', format: 'date-time'},
              currency: {type: 'string'},
              coverImage: {type: 'string'},
              images: {type: 'array', items: {type: 'string'}},
              colors: {type: 'array', items: {type: 'string'}},
              sizes: {type: 'array', items: {type: 'string'}},
              stockQuantity: {type: 'number'},
              trackInventory: {type: 'boolean'},
              lowStockThreshold: {type: 'number'},
              inStock: {type: 'boolean'},
              isNewArrival: {type: 'boolean'},
              isBestSeller: {type: 'boolean'},
              isFeatured: {type: 'boolean'},
              newArrivalStartDate: {type: 'string', format: 'date-time'},
              newArrivalEndDate: {type: 'string', format: 'date-time'},
              categories: {type: 'array', items: {type: 'string'}},
              tags: {type: 'array', items: {type: 'string'}},
              status: {type: 'string', enum: ['draft', 'published', 'archived']},
              seoTitle: {type: 'string'},
              seoDescription: {type: 'string'},
              seoKeywords: {type: 'array', items: {type: 'string'}},
              sku: {type: 'string'},
            },
          },
        },
      },
    })
    productData: Partial<Product>,
  ): Promise<Product> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    // If name is being updated and slug is not provided, regenerate slug
    if (productData.name && !productData.slug) {
      productData.slug = await this.slugService.generateUniqueSlug(
        productData.name,
        this.productRepository,
        id,
      );
    }

    // If slug is being updated, check if it's unique
    if (productData.slug && productData.slug !== existingProduct.slug) {
      const slugExists = await this.productRepository.slugExists(
        productData.slug,
        id,
      );
      if (slugExists) {
        throw new HttpErrors.BadRequest(
          `Product with slug "${productData.slug}" already exists`,
        );
      }
    }

    const now = new Date();
    await this.productRepository.updateById(id, {
      ...productData,
      updatedAt: now,
    });

    return this.productRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @del('/api/products/{id}')
  @response(204, {
    description: 'Product DELETE success',
  })
  async deleteById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<void> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    await this.productRepository.deleteById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/products/{id}/publish')
  @response(200, {
    description: 'Product published successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async publish(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<Product> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    const now = new Date();
    await this.productRepository.updateById(id, {
      status: 'published',
      publishedAt: existingProduct.publishedAt || now,
      updatedAt: now,
    });

    return this.productRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/products/{id}/archive')
  @response(200, {
    description: 'Product archived successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async archive(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<Product> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    const now = new Date();
    await this.productRepository.updateById(id, {
      status: 'archived',
      updatedAt: now,
    });

    return this.productRepository.findById(id);
  }

  // ==================== VARIANT MANAGEMENT ENDPOINTS ====================

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/products/{id}/variants')
  @response(200, {
    description: 'Array of product variants',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              sku: {type: 'string'},
              color: {type: 'string'},
              colorName: {type: 'string'},
              size: {type: 'string'},
              images: {type: 'array', items: {type: 'string'}},
              price: {type: 'number'},
              stockQuantity: {type: 'number'},
              inStock: {type: 'boolean'},
              isDefault: {type: 'boolean'},
            },
          },
        },
      },
    },
  })
  async getVariants(@param.path.string('id') id: string): Promise<any[]> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }
    return product.variants || [];
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/products/{id}/variants/{variantId}')
  @response(200, {
    description: 'Product variant details',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            sku: {type: 'string'},
            color: {type: 'string'},
            colorName: {type: 'string'},
            size: {type: 'string'},
            images: {type: 'array', items: {type: 'string'}},
            price: {type: 'number'},
            stockQuantity: {type: 'number'},
            inStock: {type: 'boolean'},
            isDefault: {type: 'boolean'},
          },
        },
      },
    },
  })
  async getVariant(
    @param.path.string('id') id: string,
    @param.path.string('variantId') variantId: string,
  ): Promise<any> {
    const variant = await this.productRepository.getVariant(id, variantId);
    if (!variant) {
      throw new HttpErrors.NotFound(
        `Variant with id "${variantId}" not found in product "${id}"`,
      );
    }
    return variant;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/products/{id}/variants')
  @response(201, {
    description: 'Variant created successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async createVariant(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['color', 'colorName', 'size', 'stockQuantity'],
            properties: {
              sku: {type: 'string'},
              color: {type: 'string'},
              colorName: {type: 'string'},
              size: {type: 'string'},
              images: {type: 'array', items: {type: 'string'}},
              price: {type: 'number', minimum: 0},
              stockQuantity: {type: 'number', minimum: 0},
              isDefault: {type: 'boolean'},
            },
          },
        },
      },
    })
    variantData: any,
  ): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    // Check if color+size combination already exists
    const exists = await this.productRepository.variantCombinationExists(
      id,
      variantData.color,
      variantData.size,
    );
    if (exists) {
      throw new HttpErrors.BadRequest(
        `Variant with color "${variantData.colorName}" and size "${variantData.size}" already exists`,
      );
    }

    // Generate variant ID and SKU
    const variantId = uuidv4();
    const variantSku = variantData.sku || `${product.sku || 'PROD'}-${variantData.color.replace('#', '')}-${variantData.size}`;

    // Create new variant
    const newVariant = {
      id: variantId,
      sku: variantSku,
      color: variantData.color,
      colorName: variantData.colorName,
      size: variantData.size,
      images: variantData.images || [],
      price: variantData.price,
      stockQuantity: variantData.stockQuantity,
      inStock: variantData.stockQuantity > 0,
      isDefault: variantData.isDefault || false,
    };

    // If this is set as default, unset other defaults
    const variants = product.variants || [];
    if (newVariant.isDefault) {
      variants.forEach(v => {
        v.isDefault = false;
      });
    }

    // Add new variant
    variants.push(newVariant);

    // Update product with new variants and recalculate total stock
    const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants,
      stockQuantity: totalStock,
      inStock: totalStock > 0,
      updatedAt: now,
    });

    return this.productRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/products/{id}/variants/{variantId}')
  @response(200, {
    description: 'Variant updated successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async updateVariant(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.path.string('variantId') variantId: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              sku: {type: 'string'},
              color: {type: 'string'},
              colorName: {type: 'string'},
              size: {type: 'string'},
              images: {type: 'array', items: {type: 'string'}},
              price: {type: 'number', minimum: 0},
              stockQuantity: {type: 'number', minimum: 0},
              isDefault: {type: 'boolean'},
            },
          },
        },
      },
    })
    variantData: any,
  ): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    if (!product.variants || product.variants.length === 0) {
      throw new HttpErrors.NotFound('Product has no variants');
    }

    const variantIndex = product.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
      throw new HttpErrors.NotFound(`Variant with id "${variantId}" not found`);
    }

    // If color or size is being updated, check for duplicates
    if (variantData.color || variantData.size) {
      const newColor = variantData.color || product.variants[variantIndex].color;
      const newSize = variantData.size || product.variants[variantIndex].size;

      const exists = await this.productRepository.variantCombinationExists(
        id,
        newColor,
        newSize,
        variantId,
      );
      if (exists) {
        throw new HttpErrors.BadRequest(
          `Variant with color "${variantData.colorName || newColor}" and size "${newSize}" already exists`,
        );
      }
    }

    // Update variant
    product.variants[variantIndex] = {
      ...product.variants[variantIndex],
      ...variantData,
      inStock: variantData.stockQuantity !== undefined
        ? variantData.stockQuantity > 0
        : product.variants[variantIndex].inStock,
    };

    // If this is set as default, unset other defaults
    if (variantData.isDefault) {
      product.variants.forEach((v, idx) => {
        if (idx !== variantIndex) {
          v.isDefault = false;
        }
      });
    }

    // Recalculate total stock
    const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants: product.variants,
      stockQuantity: totalStock,
      inStock: totalStock > 0,
      updatedAt: now,
    });

    return this.productRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @del('/api/products/{id}/variants/{variantId}')
  @response(200, {
    description: 'Variant deleted successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async deleteVariant(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.path.string('variantId') variantId: string,
  ): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    if (!product.variants || product.variants.length === 0) {
      throw new HttpErrors.NotFound('Product has no variants');
    }

    const variantIndex = product.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
      throw new HttpErrors.NotFound(`Variant with id "${variantId}" not found`);
    }

    // Remove variant
    product.variants.splice(variantIndex, 1);

    // Recalculate total stock
    const totalStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants: product.variants,
      stockQuantity: totalStock,
      inStock: totalStock > 0,
      updatedAt: now,
    });

    return this.productRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/products/{id}/variants/{variantId}/stock')
  @response(200, {
    description: 'Variant stock updated successfully',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product),
      },
    },
  })
  async updateVariantStock(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.path.string('variantId') variantId: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['stockQuantity'],
            properties: {
              stockQuantity: {type: 'number', minimum: 0},
            },
          },
        },
      },
    })
    body: {stockQuantity: number},
  ): Promise<Product> {
    return this.productRepository.updateVariantStock(id, variantId, body.stockQuantity);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/products/{id}/variants/{variantId}/availability')
  @response(200, {
    description: 'Variant availability status',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            available: {type: 'boolean'},
            stockQuantity: {type: 'number'},
          },
        },
      },
    },
  })
  async checkVariantAvailability(
    @param.path.string('id') id: string,
    @param.path.string('variantId') variantId: string,
  ): Promise<{available: boolean; stockQuantity: number}> {
    const variant = await this.productRepository.getVariant(id, variantId);
    if (!variant) {
      throw new HttpErrors.NotFound(
        `Variant with id "${variantId}" not found in product "${id}"`,
      );
    }

    return {
      available: variant.inStock && variant.stockQuantity > 0,
      stockQuantity: variant.stockQuantity,
    };
  }
}
