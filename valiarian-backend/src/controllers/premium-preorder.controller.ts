import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {IsolationLevel, repository} from '@loopback/repository';
import {get, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {ValiarianDataSource} from '../datasources';
import {PremiumPreorder, Product} from '../models';
import {
  PremiumPreorderRepository,
  ProductRepository,
} from '../repositories';
import {RazorpayService} from '../services/razorpay.service';

interface PremiumPreorderAddressRequest {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface CreatePremiumPreorderRequest {
  productSlug: string;
  variantId?: string;
  selectedColor?: string;
  billingAddress: PremiumPreorderAddressRequest;
  shippingAddress?: PremiumPreorderAddressRequest;
}

/* eslint-disable @typescript-eslint/naming-convention */
interface VerifyPremiumPreorderRequest {
  preorderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  'razorpay_order_id'?: string;
  'razorpay_payment_id'?: string;
  'razorpay_signature'?: string;
}

type PremiumProductVariant = NonNullable<Product['variants']>[number];
type PremiumPreorderTimelineEntry = {
  status: string;
  comment: string;
  createdAt: Date;
};

const roundCurrency = (value: number) => Number((value ?? 0).toFixed(2));

const hasAvailableInventory = (product: Product, variant?: PremiumProductVariant | null) => {
  if (product.trackInventory === false) {
    return true;
  }

  const stockQuantity = Number(variant?.stockQuantity ?? product.stockQuantity ?? 0);
  const inStock = variant?.inStock ?? product.inStock;

  return Boolean(inStock) && stockQuantity > 0;
};

const resolveVariant = (product: Product, variantId?: string) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (!variants.length) {
    return null;
  }

  if (variantId) {
    return variants.find(variant => variant.id === variantId) ?? null;
  }

  return (
    variants.find(variant => variant.isDefault && hasAvailableInventory(product, variant)) ??
    variants.find(variant => hasAvailableInventory(product, variant)) ??
    variants.find(variant => variant.isDefault) ??
    variants[0] ??
    null
  );
};

const resolveUnitPrice = (product: Product, variant?: PremiumProductVariant | null) => {
  const prioritizedPrices = [
    product.salePrice,
    variant?.price,
    product.price,
  ];
  const match = prioritizedPrices.find(
    value => Number.isFinite(Number(value)) && Number(value) > 0,
  );

  return match ? Number(match) : 0;
};

export class PremiumPreorderController {
  constructor(
    @inject('services.razorpay')
    public razorpayService: RazorpayService,
    @repository(PremiumPreorderRepository)
    public premiumPreorderRepository: PremiumPreorderRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject('datasources.valiarian')
    public dataSource: ValiarianDataSource,
  ) {}

  private async fetchPremiumPaymentWithRetry(paymentId: string, attempts = 2) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.razorpayService.fetchPayment(paymentId);
      } catch (error) {
        lastError = error;
        console.warn('[PREMIUM_FLOW] Failed to fetch Razorpay payment', {
          paymentId,
          attempt,
          attempts,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw lastError;
  }

  private appendNote(existingNotes: unknown, nextNote: string) {
    const normalizedExistingNotes = String(existingNotes ?? '').trim();
    return normalizedExistingNotes
      ? `${normalizedExistingNotes}\n${nextNote}`
      : nextNote;
  }

  private async getPreorderWithRelations(preorderId: string) {
    return this.premiumPreorderRepository.findById(preorderId, {
      include: [{relation: 'user'}, {relation: 'product'}],
    });
  }

  private buildPremiumPreorderTimeline(
    preorder: PremiumPreorder,
  ): PremiumPreorderTimelineEntry[] {
    const timeline: PremiumPreorderTimelineEntry[] = [
      {
        status: 'initiated',
        comment: 'Premium preorder was created.',
        createdAt: preorder.createdAt,
      },
    ];

    if (preorder.paymentStatus === 'paid' && preorder.razorpayPaymentId) {
      timeline.push({
        status: 'paid',
        comment: `Payment captured via Razorpay (${preorder.razorpayPaymentId}).`,
        createdAt: preorder.updatedAt || preorder.createdAt,
      });
    } else if (preorder.paymentStatus === 'pending') {
      timeline.push({
        status: 'payment_pending',
        comment: 'Payment is awaiting gateway confirmation.',
        createdAt: preorder.updatedAt || preorder.createdAt,
      });
    } else if (preorder.paymentStatus === 'failed') {
      timeline.push({
        status: 'payment_failed',
        comment: preorder.failureReason
          ? `Payment failed: ${preorder.failureReason}.`
          : 'Payment failed.',
        createdAt: preorder.updatedAt || preorder.createdAt,
      });
    } else if (preorder.paymentStatus === 'refunded') {
      timeline.push({
        status: 'refunded',
        comment: 'Payment was refunded for this premium preorder.',
        createdAt: preorder.updatedAt || preorder.createdAt,
      });
    }

    if (
      preorder.status &&
      !timeline.some(entry => entry.status === preorder.status)
    ) {
      timeline.push({
        status: preorder.status,
        comment:
          preorder.notes?.trim() ||
          `Premium preorder moved to ${preorder.status.replace(/_/g, ' ')}.`,
        createdAt: preorder.updatedAt || preorder.createdAt,
      });
    }

    if (preorder.expectedDispatchDate) {
      timeline.push({
        status: 'expected_dispatch',
        comment: `Expected dispatch planned for ${new Date(
          preorder.expectedDispatchDate,
        ).toLocaleDateString()}.`,
        createdAt: preorder.updatedAt || preorder.createdAt,
      });
    }

    return timeline.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  private getAvailableAdminStatusOptions(preorder: PremiumPreorder) {
    switch (preorder.status) {
      case 'initiated':
        return ['paid', 'payment_review', 'cancelled', 'failed'];
      case 'paid':
        return ['reserved', 'ready_to_fulfill', 'fulfilled', 'refunded'];
      case 'payment_review':
        return ['paid', 'reserved', 'cancelled', 'refunded'];
      case 'reserved':
        return ['ready_to_fulfill', 'fulfilled', 'cancelled', 'refunded'];
      case 'ready_to_fulfill':
        return ['fulfilled', 'cancelled', 'refunded'];
      default:
        return [];
    }
  }

  private async buildPreorderDetailResponse(preorderId: string) {
    const preorder = await this.getPreorderWithRelations(preorderId);

    return {
      preorder,
      timeline: this.buildPremiumPreorderTimeline(preorder),
      availableStatusOptions: this.getAvailableAdminStatusOptions(preorder),
    };
  }

  private async getOwnedPreorder(preorderId: string, userId: string) {
    const preorder = await this.premiumPreorderRepository.findById(preorderId);

    if (!preorder || preorder.isDeleted) {
      throw new HttpErrors.NotFound('Premium preorder not found');
    }

    if (preorder.userId !== userId) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    return preorder;
  }

  private normalizeVerifyPaymentRequest(request: VerifyPremiumPreorderRequest) {
    return {
      preorderId: request.preorderId,
      razorpayOrderId: request.razorpayOrderId ?? request.razorpay_order_id ?? '',
      razorpayPaymentId: request.razorpayPaymentId ?? request.razorpay_payment_id ?? '',
      razorpaySignature: request.razorpaySignature ?? request.razorpay_signature ?? '',
    };
  }

  @post('/api/premium-preorders/create')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async createPremiumPreorder(
    @requestBody() request: CreatePremiumPreorderRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    preorder: PremiumPreorder;
    preorderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId?: string;
  }> {
    const product = await this.productRepository.findBySlug(request.productSlug);

    if (!product || product.status !== 'published' || product.isPremium !== true) {
      throw new HttpErrors.NotFound('Premium preorder product not found');
    }

    const variant = resolveVariant(product, request.variantId);

    if (request.variantId && !variant) {
      throw new HttpErrors.BadRequest('Selected premium product variant was not found');
    }

    if (!hasAvailableInventory(product, variant)) {
      throw new HttpErrors.BadRequest('Selected premium product is out of stock');
    }

    const unitPrice = resolveUnitPrice(product, variant);

    if (unitPrice <= 0) {
      throw new HttpErrors.BadRequest('Premium preorder product price is invalid');
    }

    const preorderNumber = await this.premiumPreorderRepository.generatePreorderNumber(
      process.env.PREMIUM_PREORDER_PREFIX ?? 'PPR',
    );

    const subtotal = roundCurrency(unitPrice);
    const total = subtotal;

    const razorpayOrder = await this.razorpayService.createOrder(
      Math.round(total * 100),
      product.currency ?? 'INR',
      preorderNumber,
      {
        userId: currentUser.id,
        preorderNumber,
        productSlug: product.slug,
      },
    );

    const address = request.shippingAddress ?? request.billingAddress;

    const preorder = await this.premiumPreorderRepository.create({
      preorderNumber,
      userId: currentUser.id,
      productId: product.id,
      productSnapshot: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        coverImage:
          variant?.images?.[0] ??
          product.coverImage ??
          product.images?.[0] ??
          '',
        sku: variant?.sku ?? product.sku ?? '',
        price: unitPrice,
        originalPrice: Number(variant?.price ?? product.price ?? unitPrice),
        currency: product.currency ?? 'INR',
        variantLabel: variant
          ? [variant.size, variant.colorName ?? variant.color].filter(Boolean).join(' / ')
          : '',
      },
      selectedVariantId: variant?.id,
      selectedSize: variant?.size,
      selectedColor:
        request.selectedColor ??
        variant?.colorName ??
        variant?.color ??
        '',
      quantity: 1,
      status: 'initiated',
      paymentStatus: 'created',
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
      subtotal,
      discount: 0,
      shipping: 0,
      tax: 0,
      total,
      currency: product.currency ?? 'INR',
      billingAddress: request.billingAddress,
      shippingAddress: address,
      isDeleted: false,
    });

    return {
      success: true,
      preorder,
      preorderId: preorder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: Math.round(total * 100),
      currency: preorder.currency ?? 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  @post('/api/premium-preorders/verify')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async verifyPremiumPreorderPayment(
    @requestBody() request: VerifyPremiumPreorderRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    preorder: PremiumPreorder;
    status: string;
  }> {
    const normalizedRequest = this.normalizeVerifyPaymentRequest(request);
    const preorder = await this.getOwnedPreorder(normalizedRequest.preorderId, currentUser.id);
    const razorpayOrderId = normalizedRequest.razorpayOrderId;
    const razorpayPaymentId = normalizedRequest.razorpayPaymentId;
    const razorpaySignature = normalizedRequest.razorpaySignature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpErrors.BadRequest('Missing Razorpay payment details');
    }

    if (preorder.razorpayOrderId !== razorpayOrderId) {
      throw new HttpErrors.BadRequest('Premium preorder payment does not match the order');
    }

    const razorpayPayment = await this.fetchPremiumPaymentWithRetry(razorpayPaymentId);
    const isMatchingPayment =
      razorpayPayment?.order_id === razorpayOrderId &&
      razorpayPayment?.id === razorpayPaymentId;
    const paymentGatewayStatus = String(razorpayPayment?.status ?? '').toLowerCase();
    const isCapturedPayment = isMatchingPayment && paymentGatewayStatus === 'captured';
    const isPendingPayment =
      isMatchingPayment && ['created', 'authorized', 'pending'].includes(paymentGatewayStatus);
    const isValid = this.razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (
      preorder.paymentStatus === 'paid' &&
      ['paid', 'payment_review', 'reserved', 'ready_to_fulfill', 'fulfilled'].includes(
        preorder.status,
      )
    ) {
      return {
        success: true,
        preorder: await this.getPreorderWithRelations(preorder.id),
        status: preorder.status,
      };
    }

    const transaction = await this.dataSource.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    let transactionCompleted = false;

    try {
      if (!isValid) {
        await this.premiumPreorderRepository.updateById(
          preorder.id,
          {
            paymentStatus: 'failed',
            status: 'failed',
            razorpayPaymentId,
            razorpaySignature,
            failureReason: 'invalid_signature',
            updatedAt: new Date(),
          },
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;
        throw new HttpErrors.BadRequest('Invalid payment signature');
      }

      if (isPendingPayment) {
        await this.premiumPreorderRepository.updateById(
          preorder.id,
          {
            paymentStatus: 'pending',
            status: 'initiated',
            razorpayPaymentId,
            razorpaySignature,
            updatedAt: new Date(),
          },
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;

        return {
          success: true,
          preorder: await this.getPreorderWithRelations(preorder.id),
          status: 'pending',
        };
      }

      if (!isCapturedPayment) {
        await this.premiumPreorderRepository.updateById(
          preorder.id,
          {
            paymentStatus: 'failed',
            status: 'failed',
            razorpayPaymentId,
            razorpaySignature,
            notes: this.appendNote(
              preorder.notes,
              `Unexpected Razorpay payment status: ${paymentGatewayStatus || 'unknown'}`,
            ),
            failureReason: 'payment_not_captured',
            updatedAt: new Date(),
          },
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;
        throw new HttpErrors.BadRequest('Payment is not captured by Razorpay');
      }

      const product = await this.productRepository.findById(
        preorder.productId,
        undefined,
        {transaction},
      );

      const reserved = preorder.selectedVariantId
        ? await this.productRepository.reserveVariantStockAtomic(
            preorder.productId,
            preorder.selectedVariantId,
            preorder.quantity ?? 1,
            {transaction},
          )
        : await this.productRepository.reserveProductStockAtomic(
            preorder.productId,
            preorder.quantity ?? 1,
            {transaction},
          );

      if (!reserved) {
        await this.premiumPreorderRepository.updateById(
          preorder.id,
          {
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            paymentStatus: 'paid',
            status: 'payment_review',
            reviewRequired: true,
            failureReason: 'stock_unavailable_after_payment',
            notes: this.appendNote(
              preorder.notes,
              'Payment captured successfully, but stock reservation failed. Refund review required.',
            ),
            updatedAt: new Date(),
          },
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;

        return {
          success: true,
          preorder: await this.getPreorderWithRelations(preorder.id),
          status: 'payment_review',
        };
      }

      await this.productRepository.updateById(
          product.id,
          {
            soldCount: Number(product.soldCount ?? 0) + Number(preorder.quantity ?? 1),
            updatedAt: new Date(),
          },
        {transaction},
      );

      await this.premiumPreorderRepository.updateById(
        preorder.id,
        {
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
          paymentStatus: 'paid',
          status: 'paid',
          reviewRequired: false,
          failureReason: '',
          updatedAt: new Date(),
        },
        {transaction},
      );

      await transaction.commit();
      transactionCompleted = true;
    } catch (error) {
      if (!transactionCompleted) {
        await transaction.rollback();
      }

      if (!isValid) {
        throw new HttpErrors.BadRequest('Invalid payment signature');
      }

      if (isPendingPayment) {
        return {
          success: true,
          preorder: await this.getPreorderWithRelations(preorder.id),
          status: 'pending',
        };
      }

      if (!isCapturedPayment) {
        throw new HttpErrors.BadRequest('Payment is not captured by Razorpay');
      }

      await this.premiumPreorderRepository.updateById(preorder.id, {
        paymentStatus: 'paid',
        status: 'payment_review',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        reviewRequired: true,
        failureReason: 'stock_unavailable_after_payment',
        notes: this.appendNote(
          preorder.notes,
          'Payment captured successfully, but stock reservation failed. Refund review required.',
        ),
        updatedAt: new Date(),
      });

      return {
        success: true,
        preorder: await this.getPreorderWithRelations(preorder.id),
        status: 'payment_review',
      };
    }

    return {
      success: true,
      preorder: await this.getPreorderWithRelations(preorder.id),
      status: 'paid',
    };
  }

  @post('/api/premium-preorders/{preorderId}/payment-failed')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async markPremiumPaymentFailure(
    @param.path.string('preorderId') preorderId: string,
    @requestBody()
    request: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      reason?: string;
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; preorder: PremiumPreorder}> {
    const preorder = await this.getOwnedPreorder(preorderId, currentUser.id);

    if (
      preorder.paymentStatus === 'failed' &&
      ['failed', 'payment_failed', 'cancelled'].includes(preorder.status)
    ) {
      return {
        success: true,
        preorder: await this.getPreorderWithRelations(preorder.id),
      };
    }

    await this.premiumPreorderRepository.updateById(preorder.id, {
      status: 'failed',
      paymentStatus: 'failed',
      razorpayOrderId: request.razorpayOrderId ?? preorder.razorpayOrderId,
      razorpayPaymentId: request.razorpayPaymentId ?? preorder.razorpayPaymentId,
      failureReason: request.reason ?? 'checkout_abandoned',
      reviewRequired: false,
      notes: this.appendNote(
        preorder.notes,
        `Payment marked as failed: ${request.reason ?? 'checkout_abandoned'}`,
      ),
      updatedAt: new Date(),
    });

    return {
      success: true,
      preorder: await this.getPreorderWithRelations(preorder.id),
    };
  }

  @get('/api/premium-preorders/user/{userId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getUserPremiumPreorders(
    @param.path.string('userId') userId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; preorders: PremiumPreorder[]}> {
    if (userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('You can only access your own premium preorders');
    }

    const preorders = await this.premiumPreorderRepository.find({
      where: {
        userId,
        isDeleted: false,
      },
      order: ['createdAt DESC'],
      include: [{relation: 'product'}],
    });

    return {
      success: true,
      preorders,
    };
  }

  @get('/api/premium-preorders/{preorderId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getPremiumPreorderDetails(
    @param.path.string('preorderId') preorderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    preorder: PremiumPreorder;
    timeline: PremiumPreorderTimelineEntry[];
  }> {
    await this.getOwnedPreorder(preorderId, currentUser.id);

    const detail = await this.buildPreorderDetailResponse(preorderId);

    return {
      success: true,
      preorder: detail.preorder,
      timeline: detail.timeline,
    };
  }

  @get('/api/admin/premium-preorders')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getAdminPremiumPreorders(
    @param.query.number('page') page = 1,
    @param.query.number('limit') limit = 20,
    @param.query.string('status') status?: string,
    @param.query.string('paymentStatus') paymentStatus?: string,
    @param.query.string('search') search?: string,
  ): Promise<{
    success: boolean;
    preorders: PremiumPreorder[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    counts: Record<string, number>;
  }> {
    const skip = (page - 1) * limit;
    const result = await this.premiumPreorderRepository.searchPremiumPreorders({
      search,
      status,
      paymentStatus,
      limit,
      skip,
    });

    const statusValues = [
      'initiated',
      'paid',
      'failed',
      'payment_failed',
      'payment_review',
      'reserved',
      'ready_to_fulfill',
      'fulfilled',
      'cancelled',
      'refunded',
    ];

    const counts: Record<string, number> = {all: 0};
    const allCount = await this.premiumPreorderRepository.count({isDeleted: false});
    counts.all = allCount.count;

    await Promise.all(
      statusValues.map(async value => {
        const count = await this.premiumPreorderRepository.count({
          status: value as PremiumPreorder['status'],
          isDeleted: false,
        });
        counts[value] = count.count;
      }),
    );

    return {
      success: true,
      preorders: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
      counts,
    };
  }

  @get('/api/admin/premium-preorders/{preorderId}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getAdminPremiumPreorderDetails(
    @param.path.string('preorderId') preorderId: string,
  ): Promise<{
    success: boolean;
    preorder: PremiumPreorder;
    timeline: PremiumPreorderTimelineEntry[];
    availableStatusOptions: string[];
  }> {
    const preorder = await this.premiumPreorderRepository.findById(preorderId, {
      include: [{relation: 'user'}, {relation: 'product'}],
    });

    if (!preorder || preorder.isDeleted) {
      throw new HttpErrors.NotFound('Premium preorder not found');
    }

    const detail = await this.buildPreorderDetailResponse(preorderId);

    return {
      success: true,
      preorder: detail.preorder,
      timeline: detail.timeline,
      availableStatusOptions: detail.availableStatusOptions,
    };
  }

  @patch('/api/admin/premium-preorders/{preorderId}/status')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async updateAdminPremiumPreorderStatus(
    @param.path.string('preorderId') preorderId: string,
    @requestBody()
    request: {
      status: PremiumPreorder['status'];
      notes?: string;
      expectedDispatchDate?: string;
    },
  ): Promise<{
    success: boolean;
    preorder: PremiumPreorder;
    timeline: PremiumPreorderTimelineEntry[];
    availableStatusOptions: string[];
  }> {
    const preorder = await this.premiumPreorderRepository.findById(preorderId);

    if (!preorder || preorder.isDeleted) {
      throw new HttpErrors.NotFound('Premium preorder not found');
    }

    await this.premiumPreorderRepository.updateById(preorder.id, {
      status: request.status,
      notes: request.notes ?? preorder.notes,
      expectedDispatchDate: request.expectedDispatchDate
        ? new Date(request.expectedDispatchDate)
        : preorder.expectedDispatchDate,
      updatedAt: new Date(),
    });

    const detail = await this.buildPreorderDetailResponse(preorder.id);

    return {
      success: true,
      preorder: detail.preorder,
      timeline: detail.timeline,
      availableStatusOptions: detail.availableStatusOptions,
    };
  }
}
