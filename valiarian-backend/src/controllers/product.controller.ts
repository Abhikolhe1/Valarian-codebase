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
import {Product, ProductVariant} from '../models';
import {CategoryRepository, ProductRepository} from '../repositories';
import {EmailService} from '../services/email.service';
import {SlugService} from '../services/slug.service';
import SITE_SETTINGS from '../utils/config';

export class ProductController {
  constructor(
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
    @inject('services.SlugService')
    public slugService: SlugService,
    @inject('services.email')
    public emailService: EmailService,
  ) { }

  private async ensureCategoryExists(categoryId?: string): Promise<void> {
    if (!categoryId) return;

    try {
      await this.categoryRepository.findById(categoryId);
    } catch {
      throw new HttpErrors.UnprocessableEntity(
        `Category with id "${categoryId}" was not found`,
      );
    }
  }

  private normalizeVariants(
    variants: ProductVariant[] = [],
  ): {
    variants: ProductVariant[];
    stockQuantity: number;
    inStock: boolean;
  } {
    if (!Array.isArray(variants) || variants.length === 0) {
      return {
        variants: [],
        stockQuantity: 0,
        inStock: false,
      };
    }

    const normalizedVariants = variants.map((variant, index) => {
      const stockQuantity = Math.max(0, Number(variant.stockQuantity || 0));

      return {
        ...variant,
        stockQuantity,
        inStock: stockQuantity > 0,
        isDefault:
          variants.length === 1 ? true : Boolean(variant.isDefault && index >= 0),
      } as ProductVariant;
    });

    const defaultVariant = [...normalizedVariants]
      .reverse()
      .find(variant => variant.isDefault);
    const variantsWithDefault = normalizedVariants.map((variant, index) => ({
      ...variant,
      isDefault:
        defaultVariant
          ? variant.id === defaultVariant.id
          : index === 0,
    })) as ProductVariant[];

    const stockQuantity = variantsWithDefault.reduce(
      (sum, variant) => sum + Number(variant.stockQuantity || 0),
      0,
    );

    return {
      variants: variantsWithDefault,
      stockQuantity,
      inStock: stockQuantity > 0,
    };
  }

  private applyVariantInventoryToProductData(
    productData: Partial<Product>,
  ): Partial<Product> {
    if (!Array.isArray(productData.variants) || productData.variants.length === 0) {
      return productData;
    }

    const normalized = this.normalizeVariants(productData.variants as ProductVariant[]);

    return {
      ...productData,
      variants: normalized.variants,
      stockQuantity: normalized.stockQuantity,
      inStock: normalized.inStock,
    };
  }

  private getDefaultVariantLowStockContext(product: Product): {
    defaultVariant: {
      id?: string;
      sku?: string;
      color?: string;
      colorName?: string;
      size?: string;
      stockQuantity: number;
    };
    threshold: number;
    isOutOfStock: boolean;
  } | null {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const defaultVariant =
      variants.find(variant => variant.isDefault) ||
      (variants.length === 1 ? variants[0] : null);

    if (!defaultVariant) {
      return null;
    }

    const stockQuantity = Math.max(0, Number(defaultVariant.stockQuantity || 0));
    const threshold = Math.max(0, Number(product.lowStockThreshold ?? 5));
    const isOutOfStock = stockQuantity <= 0;
    const isLowStock = stockQuantity <= threshold;

    if (!isLowStock) {
      return null;
    }

    return {
      defaultVariant: {
        id: defaultVariant.id,
        sku: defaultVariant.sku,
        color: defaultVariant.color,
        colorName: defaultVariant.colorName,
        size: defaultVariant.size,
        stockQuantity,
      },
      threshold,
      isOutOfStock,
    };
  }

  private async sendDefaultVariantLowStockAlert(product: Product): Promise<void> {
    const alertEmail = process.env.LOW_STOCK_ALERT_EMAIL;

    if (!alertEmail) {
      console.log('[ProductController] LOW_STOCK_ALERT_EMAIL not configured, skipping alert');
      return;
    }

    const lowStockContext = this.getDefaultVariantLowStockContext(product);

    if (!lowStockContext) {
      return;
    }

    const {defaultVariant, threshold, isOutOfStock} = lowStockContext;
    const stockMessage = isOutOfStock
      ? 'is out of stock'
      : `is low on stock (${defaultVariant.stockQuantity} left)`;
    const productIdentifier = product.slug || product.id;

    try {
      await this.emailService.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || SITE_SETTINGS.fromMail,
        to: alertEmail,
        subject: `Default variant stock alert for ${product.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 12px;">Default Variant Stock Alert</h2>
            <p>The current default variant for <strong>${product.name}</strong> ${stockMessage}.</p>
            <p>Please review the product and change the default variant manually if needed.</p>
            <table style="border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Product</strong></td><td>${product.name}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Product ID</strong></td><td>${product.id}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Slug</strong></td><td>${productIdentifier}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Variant SKU</strong></td><td>${defaultVariant.sku || '-'}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Color</strong></td><td>${defaultVariant.colorName || defaultVariant.color || '-'}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Size</strong></td><td>${defaultVariant.size || '-'}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Stock Left</strong></td><td>${defaultVariant.stockQuantity}</td></tr>
              <tr><td style="padding: 6px 12px 6px 0;"><strong>Low Stock Threshold</strong></td><td>${threshold}</td></tr>
            </table>
          </div>
        `,
      });

      console.log('[ProductController] Default variant low stock alert sent', {
        productId: product.id,
        variantId: defaultVariant.id,
        stockQuantity: defaultVariant.stockQuantity,
        to: alertEmail,
      });
    } catch (error: any) {
      console.error('[ProductController] Failed to send default variant low stock alert', {
        productId: product.id,
        variantId: defaultVariant.id,
        message: error?.message,
      });
    }
  }

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
              variants: {
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
                    price: {type: 'number', minimum: 0},
                    stockQuantity: {type: 'number', minimum: 0},
                    inStock: {type: 'boolean'},
                    isDefault: {type: 'boolean'},
                  },
                },
              },
              colors: {type: 'array', items: {type: 'string'}},
              sizes: {type: 'array', items: {type: 'string'}},
              stockQuantity: {type: 'number'},
              trackInventory: {type: 'boolean'},
              lowStockThreshold: {type: 'number'},
              inStock: {type: 'boolean'},
              isNewArrival: {type: 'boolean'},
              isBestSeller: {type: 'boolean'},
              isFeatured: {type: 'boolean'},
              isPremium: {type: 'boolean'},
              newArrivalStartDate: {type: 'string', format: 'date-time'},
              newArrivalEndDate: {type: 'string', format: 'date-time'},
              categoryId: {type: 'string', format: 'uuid'},
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
    console.log('REQUEST BODY:', productData);
    await this.ensureCategoryExists(productData.categoryId);
    const normalizedProductData = this.applyVariantInventoryToProductData(productData) as Omit<
      Product,
      'id' | 'createdAt' | 'updatedAt'
    >;

    // Generate unique slug if not provided
    if (!normalizedProductData.slug) {
      normalizedProductData.slug = await this.slugService.generateUniqueSlug(
        normalizedProductData.name,
        this.productRepository,
      );
    } else {
      // If slug is provided, ensure it's unique
      const slugExists = await this.productRepository.slugExists(normalizedProductData.slug);
      if (slugExists) {
        throw new HttpErrors.BadRequest(
          `Product with slug "${normalizedProductData.slug}" already exists`,
        );
      }
    }

    const now = new Date();
    const product = await this.productRepository.create({
      id: uuidv4(),
      ...normalizedProductData,
      createdAt: now,
      updatedAt: now,
    });

    await this.sendDefaultVariantLowStockAlert(product);

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
    @param.query.boolean('isPremium') isPremium?: boolean,
    @param.query.boolean('inStock') inStock?: boolean,
    @param.query.string('categoryId') categoryId?: string,
    @param.query.number('limit') limit = 50,
    @param.query.number('offset') offset = 0,
  ): Promise<{products: Product[]; total: number}> {
    const result = await this.productRepository.searchProducts({
      search,
      status,
      isNewArrival,
      isBestSeller,
      isFeatured,
      isPremium,
      inStock,
      categoryId,
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
              variants: {
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
                    price: {type: 'number', minimum: 0},
                    stockQuantity: {type: 'number', minimum: 0},
                    inStock: {type: 'boolean'},
                    isDefault: {type: 'boolean'},
                  },
                },
              },
              colors: {type: 'array', items: {type: 'string'}},
              sizes: {type: 'array', items: {type: 'string'}},
              stockQuantity: {type: 'number'},
              trackInventory: {type: 'boolean'},
              lowStockThreshold: {type: 'number'},
              inStock: {type: 'boolean'},
              isNewArrival: {type: 'boolean'},
              isBestSeller: {type: 'boolean'},
              isFeatured: {type: 'boolean'},
              isPremium: {type: 'boolean'},
              newArrivalStartDate: {type: 'string', format: 'date-time'},
              newArrivalEndDate: {type: 'string', format: 'date-time'},
              categoryId: {type: 'string', format: 'uuid'},
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
    console.log('REQUEST BODY:', productData);
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new HttpErrors.NotFound(`Product with id "${id}" not found`);
    }

    await this.ensureCategoryExists(productData.categoryId);
    productData = this.applyVariantInventoryToProductData(productData);

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

    const updatedProduct = await this.productRepository.findById(id);
    await this.sendDefaultVariantLowStockAlert(updatedProduct);

    return updatedProduct;
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
    const newVariant: any = {
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

    const variants = [...(product.variants || [])];
    variants.push(newVariant);

    const normalized = this.normalizeVariants(variants as ProductVariant[]);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants: normalized.variants,
      stockQuantity: normalized.stockQuantity,
      inStock: normalized.inStock,
      updatedAt: now,
    });

    const updatedProduct = await this.productRepository.findById(id);
    await this.sendDefaultVariantLowStockAlert(updatedProduct);

    return updatedProduct;
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

    product.variants[variantIndex] = {
      ...product.variants[variantIndex],
      ...variantData,
      inStock: variantData.stockQuantity !== undefined
        ? variantData.stockQuantity > 0
        : product.variants[variantIndex].inStock,
    };

    const normalized = this.normalizeVariants(product.variants as ProductVariant[]);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants: normalized.variants,
      stockQuantity: normalized.stockQuantity,
      inStock: normalized.inStock,
      updatedAt: now,
    });

    const updatedProduct = await this.productRepository.findById(id);
    await this.sendDefaultVariantLowStockAlert(updatedProduct);

    return updatedProduct;
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

    const normalized = this.normalizeVariants(product.variants as ProductVariant[]);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants: normalized.variants,
      stockQuantity: normalized.stockQuantity,
      inStock: normalized.inStock,
      updatedAt: now,
    });

    const updatedProduct = await this.productRepository.findById(id);
    await this.sendDefaultVariantLowStockAlert(updatedProduct);

    return updatedProduct;
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

    const quantity = Math.max(0, Number(body.stockQuantity || 0));
    Object.assign(product.variants[variantIndex], {
      stockQuantity: quantity,
      inStock: quantity > 0,
    });

    const normalized = this.normalizeVariants(product.variants as ProductVariant[]);
    const now = new Date();

    await this.productRepository.updateById(id, {
      variants: normalized.variants,
      stockQuantity: normalized.stockQuantity,
      inStock: normalized.inStock,
      updatedAt: now,
    });

    const updatedProduct = await this.productRepository.findById(id);
    await this.sendDefaultVariantLowStockAlert(updatedProduct);

    return updatedProduct;
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
