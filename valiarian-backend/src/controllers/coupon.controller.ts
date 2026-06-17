import {authenticate} from '@loopback/authentication';
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
import {authorize} from '../authorization';
import {Coupon} from '../models';
import {
  CouponRepository,
  OrderRepository,
  ProductRepository,
  ProductVariantRepository,
} from '../repositories';
import {
  calculateCouponDiscount,
  getCouponAvailabilityError,
  normalizeCouponCode,
  resolveCheckoutUnitPrice,
  roundCouponCurrency,
} from '../utils/coupon.utils';

type PaymentMethod = 'razorpay' | 'cod' | 'wallet';

interface CouponCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price?: number;
}

export class CouponController {
  constructor(
    @repository(CouponRepository)
    public couponRepository: CouponRepository,
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(ProductVariantRepository)
    public productVariantRepository: ProductVariantRepository,
  ) {}

  private async calculateSubtotal(cartItems: CouponCartItem[]): Promise<number> {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new HttpErrors.BadRequest('Cart is empty');
    }

    let subtotal = 0;

    for (const item of cartItems) {
      const quantity = Number(item.quantity || 0);

      if (quantity <= 0) {
        continue;
      }

      const product = await this.productRepository.findById(item.productId).catch(() => null);

      if (!product || product.status !== 'published') {
        continue;
      }

      let variant = null;

      if (item.variantId) {
        variant = await this.productVariantRepository.findById(item.variantId).catch(() => null);

        if (!variant && Array.isArray(product.variants)) {
          variant = product.variants.find(entry => entry.id === item.variantId) || null;
        }

        if (!variant) {
          continue;
        }
      }

      const itemPrice = resolveCheckoutUnitPrice({
        requestedPrice: item.price,
        product,
        variant,
      });

      subtotal += itemPrice * quantity;
    }

    return roundCouponCurrency(subtotal);
  }

  private async countCouponUsage(couponId: string, userId?: string): Promise<number> {
    const where: any = {
      couponId,
      isDeleted: false,
      paymentStatus: {neq: 'failed'},
      status: {neq: 'cancelled'},
    };

    if (userId) {
      where.userId = userId;
    }

    const result = await this.orderRepository.count(where);
    return result.count;
  }

  private async countCompletedOrdersForUser(userId?: string): Promise<number> {
    if (!userId) {
      return 0;
    }

    const result = await this.orderRepository.count({
      userId,
      isDeleted: false,
      paymentStatus: {neq: 'failed'},
      status: {neq: 'cancelled'},
    } as any);

    return result.count;
  }

  private async buildCouponValidationResult(params: {
    code: string;
    subtotal: number;
    userId?: string;
    paymentMethod?: PaymentMethod;
  }) {
    const normalizedCode = normalizeCouponCode(params.code);

    if (!normalizedCode) {
      throw new HttpErrors.BadRequest('Please enter a coupon code');
    }

    const coupon = await this.couponRepository.findByCode(normalizedCode);
    const availabilityError = getCouponAvailabilityError(coupon as Coupon);

    if (availabilityError) {
      throw new HttpErrors.BadRequest(availabilityError);
    }

    const subtotal = roundCouponCurrency(params.subtotal);

    if (subtotal <= 0) {
      throw new HttpErrors.BadRequest('Your cart is empty');
    }

    if (Number(coupon!.minOrderAmount || 0) > subtotal) {
      throw new HttpErrors.BadRequest(
        `Coupon is valid on orders above Rs. ${Number(coupon!.minOrderAmount).toFixed(2)}`,
      );
    }

    if (
      params.paymentMethod &&
      Array.isArray(coupon!.applicablePaymentMethods) &&
      coupon!.applicablePaymentMethods.length > 0 &&
      !coupon!.applicablePaymentMethods.includes(params.paymentMethod)
    ) {
      throw new HttpErrors.BadRequest('This coupon is not valid for the selected payment method');
    }

    if (coupon!.isFirstOrderOnly) {
      const priorOrders = await this.countCompletedOrdersForUser(params.userId);

      if (priorOrders > 0) {
        throw new HttpErrors.BadRequest('This coupon is only valid on your first order');
      }
    }

    const [totalUsageCount, userUsageCount] = await Promise.all([
      this.countCouponUsage(coupon!.id),
      params.userId ? this.countCouponUsage(coupon!.id, params.userId) : Promise.resolve(0),
    ]);

    if (
      Number(coupon!.totalUsageLimit || 0) > 0 &&
      totalUsageCount >= Number(coupon!.totalUsageLimit)
    ) {
      throw new HttpErrors.BadRequest('This coupon has reached its maximum usage limit');
    }

    if (
      params.userId &&
      Number(coupon!.perUserUsageLimit || 0) > 0 &&
      userUsageCount >= Number(coupon!.perUserUsageLimit)
    ) {
      throw new HttpErrors.BadRequest(
        `You have already used this coupon ${Number(coupon!.perUserUsageLimit)} times`,
      );
    }

    const discountAmount = calculateCouponDiscount(coupon!, subtotal);

    if (discountAmount <= 0) {
      throw new HttpErrors.BadRequest('This coupon is not valid for your cart');
    }

    return {
      coupon,
      subtotal,
      discountAmount,
      finalTotal: roundCouponCurrency(subtotal - discountAmount),
    };
  }

  @post('/api/coupons/validate')
  @response(200, {
    description: 'Validate a coupon against the current cart',
  })
  async validateCoupon(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code', 'cartItems'],
            properties: {
              code: {type: 'string'},
              userId: {type: 'string'},
              paymentMethod: {
                type: 'string',
                enum: ['razorpay', 'cod', 'wallet'],
              },
              cartItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: {type: 'string'},
                    variantId: {type: 'string'},
                    quantity: {type: 'number'},
                    price: {type: 'number'},
                  },
                },
              },
            },
          },
        },
      },
    })
    request: {
      code: string;
      userId?: string;
      paymentMethod?: PaymentMethod;
      cartItems: CouponCartItem[];
    },
  ): Promise<{
    success: boolean;
    subtotal: number;
    discountAmount: number;
    finalTotal: number;
    coupon: Record<string, unknown>;
  }> {
    const subtotal = await this.calculateSubtotal(request.cartItems);
    const validation = await this.buildCouponValidationResult({
      code: request.code,
      subtotal,
      userId: request.userId,
      paymentMethod: request.paymentMethod,
    });
    const coupon = validation.coupon as Coupon;

    return {
      success: true,
      subtotal: validation.subtotal,
      discountAmount: validation.discountAmount,
      finalTotal: validation.finalTotal,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount || null,
        minOrderAmount: coupon.minOrderAmount || 0,
      },
    };
  }

  @get('/api/admin/coupons')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @response(200, {
    description: 'Coupon list',
  })
  async listCoupons(
    @param.query.string('search') search?: string,
    @param.query.string('isActive') isActive?: string,
    @param.query.number('page') page = 1,
    @param.query.number('limit') limit = 20,
  ): Promise<{
    coupons: Array<Record<string, unknown>>;
    pagination: {page: number; limit: number; total: number; totalPages: number};
  }> {
    const safePage = Math.max(1, Number(page || 1));
    const safeLimit = Math.min(100, Math.max(1, Number(limit || 20)));
    const activeFilter =
      typeof isActive === 'string' && isActive.length > 0 ? isActive === 'true' : undefined;

    const result = await this.couponRepository.searchCoupons({
      search,
      isActive: activeFilter,
      skip: (safePage - 1) * safeLimit,
      limit: safeLimit,
    });

    const coupons = await Promise.all(
      result.data.map(async coupon => ({
        ...coupon,
        usageCount: await this.countCouponUsage(coupon.id),
      })),
    );

    return {
      coupons,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / safeLimit)),
      },
    };
  }

  @get('/api/admin/coupons/{id}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @response(200, {
    description: 'Coupon details',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Coupon),
      },
    },
  })
  async getCoupon(@param.path.string('id') id: string): Promise<Record<string, unknown>> {
    const coupon = await this.couponRepository.findById(id).catch(() => null);

    if (!coupon || coupon.isDeleted) {
      throw new HttpErrors.NotFound('Coupon not found');
    }

    return {
      ...coupon,
      usageCount: await this.countCouponUsage(coupon.id),
    };
  }

  @post('/api/admin/coupons')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @response(200, {
    description: 'Create coupon',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Coupon),
      },
    },
  })
  async createCoupon(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code', 'title', 'discountType', 'discountValue'],
            properties: {
              code: {type: 'string'},
              title: {type: 'string'},
              description: {type: 'string'},
              discountType: {type: 'string', enum: ['percentage', 'fixed']},
              discountValue: {type: 'number'},
              maxDiscountAmount: {type: 'number'},
              minOrderAmount: {type: 'number'},
              totalUsageLimit: {type: 'number'},
              perUserUsageLimit: {type: 'number'},
              isFirstOrderOnly: {type: 'boolean'},
              startsAt: {type: 'string', format: 'date-time'},
              endsAt: {type: 'string', format: 'date-time'},
              isActive: {type: 'boolean'},
              applicablePaymentMethods: {
                type: 'array',
                items: {type: 'string', enum: ['razorpay', 'cod', 'wallet']},
              },
            },
          },
        },
      },
    })
    data: Partial<Coupon>,
  ): Promise<Coupon> {
    const code = normalizeCouponCode(data.code || '');

    if (!code) {
      throw new HttpErrors.BadRequest('Coupon code is required');
    }

    const existingCoupon = await this.couponRepository.findByCode(code);

    if (existingCoupon) {
      throw new HttpErrors.BadRequest('Coupon code already exists');
    }

    if (
      data.discountType === 'percentage' &&
      (Number(data.discountValue || 0) <= 0 || Number(data.discountValue || 0) > 100)
    ) {
      throw new HttpErrors.BadRequest('Percentage discount must be between 0 and 100');
    }

    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      throw new HttpErrors.BadRequest('Coupon end date must be after the start date');
    }

    return this.couponRepository.create({
      ...data,
      code,
      title: String(data.title || '').trim(),
      description: String(data.description || '').trim() || undefined,
      minOrderAmount: Number(data.minOrderAmount || 0),
      discountValue: Number(data.discountValue || 0),
      maxDiscountAmount:
        Number(data.maxDiscountAmount || 0) > 0 ? Number(data.maxDiscountAmount) : undefined,
      totalUsageLimit:
        Number(data.totalUsageLimit || 0) > 0 ? Number(data.totalUsageLimit) : undefined,
      perUserUsageLimit:
        Number(data.perUserUsageLimit || 0) > 0 ? Number(data.perUserUsageLimit) : undefined,
      applicablePaymentMethods: Array.isArray(data.applicablePaymentMethods)
        ? data.applicablePaymentMethods
        : [],
      isActive: data.isActive !== false,
      isDeleted: false,
    });
  }

  @patch('/api/admin/coupons/{id}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async updateCoupon(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              code: {type: 'string'},
              title: {type: 'string'},
              description: {type: 'string'},
              discountType: {type: 'string', enum: ['percentage', 'fixed']},
              discountValue: {type: 'number'},
              maxDiscountAmount: {type: 'number'},
              minOrderAmount: {type: 'number'},
              totalUsageLimit: {type: 'number'},
              perUserUsageLimit: {type: 'number'},
              isFirstOrderOnly: {type: 'boolean'},
              startsAt: {type: 'string', format: 'date-time'},
              endsAt: {type: 'string', format: 'date-time'},
              isActive: {type: 'boolean'},
              applicablePaymentMethods: {
                type: 'array',
                items: {type: 'string', enum: ['razorpay', 'cod', 'wallet']},
              },
            },
          },
        },
      },
    })
    data: Partial<Coupon>,
  ): Promise<{success: boolean}> {
    const currentCoupon = await this.couponRepository.findById(id).catch(() => null);

    if (!currentCoupon || currentCoupon.isDeleted) {
      throw new HttpErrors.NotFound('Coupon not found');
    }

    const nextCode = data.code ? normalizeCouponCode(data.code) : currentCoupon.code;

    if (nextCode !== currentCoupon.code) {
      const existingCoupon = await this.couponRepository.findByCode(nextCode);

      if (existingCoupon && existingCoupon.id !== id) {
        throw new HttpErrors.BadRequest('Coupon code already exists');
      }
    }

    const nextDiscountType = data.discountType || currentCoupon.discountType;
    const nextDiscountValue = Number(data.discountValue ?? currentCoupon.discountValue ?? 0);

    if (nextDiscountType === 'percentage' && (nextDiscountValue <= 0 || nextDiscountValue > 100)) {
      throw new HttpErrors.BadRequest('Percentage discount must be between 0 and 100');
    }

    const nextStartsAt = data.startsAt ?? currentCoupon.startsAt;
    const nextEndsAt = data.endsAt ?? currentCoupon.endsAt;

    if (nextStartsAt && nextEndsAt && new Date(nextStartsAt) > new Date(nextEndsAt)) {
      throw new HttpErrors.BadRequest('Coupon end date must be after the start date');
    }

    await this.couponRepository.updateById(id, {
      ...data,
      ...(data.code ? {code: nextCode} : {}),
      ...(data.title !== undefined ? {title: String(data.title || '').trim()} : {}),
      ...(data.description !== undefined
        ? {description: String(data.description || '').trim() || undefined}
        : {}),
      ...(data.discountValue !== undefined ? {discountValue: nextDiscountValue} : {}),
      ...(data.minOrderAmount !== undefined
        ? {minOrderAmount: Number(data.minOrderAmount || 0)}
        : {}),
      ...(data.maxDiscountAmount !== undefined
        ? {
            maxDiscountAmount:
              Number(data.maxDiscountAmount || 0) > 0
                ? Number(data.maxDiscountAmount)
                : undefined,
          }
        : {}),
      ...(data.totalUsageLimit !== undefined
        ? {
            totalUsageLimit:
              Number(data.totalUsageLimit || 0) > 0 ? Number(data.totalUsageLimit) : undefined,
          }
        : {}),
      ...(data.perUserUsageLimit !== undefined
        ? {
            perUserUsageLimit:
              Number(data.perUserUsageLimit || 0) > 0
                ? Number(data.perUserUsageLimit)
                : undefined,
          }
        : {}),
      ...(data.applicablePaymentMethods !== undefined
        ? {
            applicablePaymentMethods: Array.isArray(data.applicablePaymentMethods)
              ? data.applicablePaymentMethods
              : [],
          }
        : {}),
    });

    return {success: true};
  }

  @del('/api/admin/coupons/{id}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async deleteCoupon(@param.path.string('id') id: string): Promise<{success: boolean}> {
    const coupon = await this.couponRepository.findById(id).catch(() => null);

    if (!coupon || coupon.isDeleted) {
      throw new HttpErrors.NotFound('Coupon not found');
    }

    await this.couponRepository.softDelete(id);

    return {success: true};
  }
}
