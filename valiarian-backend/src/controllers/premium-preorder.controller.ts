import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
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
  billingAddress: PremiumPreorderAddressRequest;
  shippingAddress?: PremiumPreorderAddressRequest;
}

interface VerifyPremiumPreorderRequest {
  preorderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

const roundCurrency = (value: number) => Number((value || 0).toFixed(2));

const resolveVariant = (product: Product, variantId?: string) => {
  if (!variantId) {
    return null;
  }

  return (product.variants || []).find(variant => variant.id === variantId) || null;
};

const resolveUnitPrice = (product: Product, variant: any) => {
  const prioritizedPrices = [
    variant?.salePrice,
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
  ) {}

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

    if (!product || product.status !== 'published') {
      throw new HttpErrors.NotFound('Premium preorder product not found');
    }

    const variant = resolveVariant(product, request.variantId);

    if (request.variantId && !variant) {
      throw new HttpErrors.BadRequest('Selected premium product variant was not found');
    }

    const unitPrice = resolveUnitPrice(product, variant);

    if (unitPrice <= 0) {
      throw new HttpErrors.BadRequest('Premium preorder product price is invalid');
    }

    const preorderNumber = await this.premiumPreorderRepository.generatePreorderNumber(
      process.env.PREMIUM_PREORDER_PREFIX || 'PPR',
    );

    const subtotal = roundCurrency(unitPrice);
    const total = subtotal;

    const razorpayOrder = await this.razorpayService.createOrder(
      Math.round(total * 100),
      product.currency || 'INR',
      preorderNumber,
      {
        userId: currentUser.id,
        preorderNumber,
        productSlug: product.slug,
      },
    );

    const address = request.shippingAddress || request.billingAddress;

    const preorder = await this.premiumPreorderRepository.create({
      preorderNumber,
      userId: currentUser.id,
      productId: product.id,
      productSnapshot: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        coverImage: variant?.images?.[0] || product.coverImage || product.images?.[0] || '',
        sku: variant?.sku || product.sku || '',
        price: unitPrice,
        originalPrice: Number(variant?.price || product.price || unitPrice),
        currency: product.currency || 'INR',
        variantLabel: variant
          ? [variant.size, variant.colorName || variant.color].filter(Boolean).join(' / ')
          : '',
      },
      selectedVariantId: variant?.id,
      selectedSize: variant?.size,
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
      currency: product.currency || 'INR',
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
      currency: preorder.currency || 'INR',
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
    const preorder = await this.getOwnedPreorder(request.preorderId, currentUser.id);

    const razorpayOrderId = request.razorpayOrderId || request.razorpay_order_id;
    const razorpayPaymentId = request.razorpayPaymentId || request.razorpay_payment_id;
    const razorpaySignature = request.razorpaySignature || request.razorpay_signature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpErrors.BadRequest('Missing Razorpay payment details');
    }

    if (preorder.razorpayOrderId !== razorpayOrderId) {
      throw new HttpErrors.BadRequest('Premium preorder payment does not match the order');
    }

    const isValid = this.razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      await this.premiumPreorderRepository.updateById(preorder.id, {
        paymentStatus: 'failed',
        status: 'payment_failed',
        razorpayPaymentId,
        razorpaySignature,
      });
      throw new HttpErrors.BadRequest('Invalid Razorpay payment signature');
    }

    await this.premiumPreorderRepository.updateById(preorder.id, {
      razorpayPaymentId,
      razorpaySignature,
      paymentStatus: 'paid',
      status: 'paid',
    });

    return {
      success: true,
      preorder: await this.premiumPreorderRepository.findById(preorder.id, {
        include: [{relation: 'user'}, {relation: 'product'}],
      }),
      status: 'paid',
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
      'payment_failed',
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
          status: value as any,
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
  ): Promise<{success: boolean; preorder: PremiumPreorder}> {
    const preorder = await this.premiumPreorderRepository.findById(preorderId, {
      include: [{relation: 'user'}, {relation: 'product'}],
    });

    if (!preorder || preorder.isDeleted) {
      throw new HttpErrors.NotFound('Premium preorder not found');
    }

    return {
      success: true,
      preorder,
    };
  }

  @patch('/api/admin/premium-preorders/{preorderId}/status')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async updateAdminPremiumPreorderStatus(
    @param.path.string('preorderId') preorderId: string,
    @requestBody() request: {status: PremiumPreorder['status']; notes?: string},
  ): Promise<{success: boolean; preorder: PremiumPreorder}> {
    const preorder = await this.premiumPreorderRepository.findById(preorderId);

    if (!preorder || preorder.isDeleted) {
      throw new HttpErrors.NotFound('Premium preorder not found');
    }

    await this.premiumPreorderRepository.updateById(preorder.id, {
      status: request.status,
      notes: request.notes || preorder.notes,
    });

    return {
      success: true,
      preorder: await this.premiumPreorderRepository.findById(preorder.id, {
        include: [{relation: 'user'}, {relation: 'product'}],
      }),
    };
  }
}
