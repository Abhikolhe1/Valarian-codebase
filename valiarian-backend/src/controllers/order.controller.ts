import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {IsolationLevel, repository} from '@loopback/repository';
import {
  get,
  HttpErrors,
  param,
  patch,
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {ValiarianDataSource} from '../datasources';
import {
  Coupon,
  Invoice,
  Order,
  OrderItemEntity,
  Payment,
  PremiumPreorder,
} from '../models';
import {
  CouponRepository,
  InvoiceRepository,
  OrderItemRepository,
  OrderRepository,
  OrderStatusHistoryRepository,
  PaymentRepository,
  PremiumPreorderRepository,
  ProductRepository,
  ProductVariantRepository,
  ShipmentRepository,
} from '../repositories';
import {ShippingService} from '../services/shipping.service';
import {InventoryLifecycleService} from '../services/inventory-lifecycle.service';
import {EmailTemplateService} from '../services/email-template.service';
import {EmailService} from '../services/email.service';
import {InvoiceGeneratorService} from '../services/invoice-generator.service';
import {InvoicePrintService} from '../services/invoice-print.service';
import {RazorpayService} from '../services/razorpay.service';
import {BarcodeService} from '../services/barcode.service';
import {
  buildRazorpayEventMarker,
  historyAlreadyContainsMarker,
  isLiveRazorpayMode,
  resolveWebhookRawBody,
} from '../utils/razorpay-webhook.utils';
import {
  calculateCouponDiscount,
  getCouponAvailabilityError,
  normalizeCouponCode,
  resolveCheckoutOriginalUnitPrice,
  resolveCheckoutUnitPrice,
} from '../utils/coupon.utils';
import {
  buildInvoiceFromOrder,
  calculateInclusiveGstBreakup,
} from '../utils/invoice.utils';

const roundCurrency = (value: number) => Number((value || 0).toFixed(2));
const normalizeNumericValue = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatCurrencyValue = (value: unknown): string =>
  normalizeNumericValue(value).toFixed(2);
const MAX_ORDER_ITEM_QUANTITY = 10;

interface CreateOrderRequest {
  cartItems: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    originalPrice?: number;
  }>;
  billingAddress: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: 'razorpay' | 'cod' | 'wallet';
  discount?: number;
  couponCode?: string;
  shipping?: number;
  tax?: number;
  orderNumber?: string;
  paymentDetails?: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
}

interface VerifyPaymentRequest {
  orderId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

/**
 * Shipment states in which the courier can still void an AWB. Mirrors the rule
 * enforced by ShipmentController.cancelShipment so the customer and admin
 * cancellation paths agree on what "not yet collected" means.
 */
const COURIER_CANCELLABLE_SHIPMENT_STATES = ['created', 'pickup_pending'];

export class OrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(CouponRepository)
    public couponRepository: CouponRepository,
    @repository(OrderStatusHistoryRepository)
    public orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @repository(OrderItemRepository)
    public orderItemRepository: OrderItemRepository,
    @repository(PremiumPreorderRepository)
    public premiumPreorderRepository: PremiumPreorderRepository,
    @repository(PaymentRepository)
    public paymentRepository: PaymentRepository,
    @repository(InvoiceRepository)
    public invoiceRepository: InvoiceRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(ProductVariantRepository)
    public productVariantRepository: ProductVariantRepository,
    @inject('datasources.valiarian')
    public dataSource: ValiarianDataSource,
    @inject('services.razorpay')
    public razorpayService: RazorpayService,
    @inject('services.email')
    public emailService: EmailService,
    @inject('services.email.template')
    public emailTemplateService: EmailTemplateService,
    @inject('services.invoice.generator')
    public invoiceGeneratorService: InvoiceGeneratorService,
    @inject('services.invoice.print')
    public invoicePrintService: InvoicePrintService,
    @inject('services.barcode')
    public barcodeService: BarcodeService,
    @repository(ShipmentRepository)
    public shipmentRepository: ShipmentRepository,
    @inject('services.shipping')
    public shippingService: ShippingService,
    @inject('services.inventory-lifecycle')
    public inventoryLifecycleService: InventoryLifecycleService,
  ) {}

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

  private async countCompletedOrdersForUser(userId: string): Promise<number> {
    const result = await this.orderRepository.count({
      userId,
      isDeleted: false,
      paymentStatus: {neq: 'failed'},
      status: {neq: 'cancelled'},
    } as any);

    return result.count;
  }

  private async validateAppliedCoupon(params: {
    couponCode?: string;
    subtotal: number;
    userId: string;
    paymentMethod: CreateOrderRequest['paymentMethod'];
  }): Promise<{
    coupon: Coupon;
    discountAmount: number;
    couponSnapshot: NonNullable<Order['couponSnapshot']>;
  } | null> {
    const normalizedCode = normalizeCouponCode(params.couponCode || '');

    if (!normalizedCode) {
      return null;
    }

    const coupon = await this.couponRepository.findByCode(normalizedCode);
    const availabilityError = getCouponAvailabilityError(coupon as Coupon);

    if (availabilityError) {
      throw new HttpErrors.BadRequest(availabilityError);
    }

    if (Number(coupon!.minOrderAmount || 0) > Number(params.subtotal || 0)) {
      throw new HttpErrors.BadRequest(
        `Coupon is valid on orders above Rs. ${Number(coupon!.minOrderAmount).toFixed(2)}`,
      );
    }

    if (
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
      this.countCouponUsage(coupon!.id, params.userId),
    ]);

    if (
      Number(coupon!.totalUsageLimit || 0) > 0 &&
      totalUsageCount >= Number(coupon!.totalUsageLimit)
    ) {
      throw new HttpErrors.BadRequest('This coupon has reached its maximum usage limit');
    }

    if (
      Number(coupon!.perUserUsageLimit || 0) > 0 &&
      userUsageCount >= Number(coupon!.perUserUsageLimit)
    ) {
      throw new HttpErrors.BadRequest(
        `You have already used this coupon ${Number(coupon!.perUserUsageLimit)} times`,
      );
    }

    const discountAmount = calculateCouponDiscount(coupon!, Number(params.subtotal || 0));

    if (discountAmount <= 0) {
      throw new HttpErrors.BadRequest('This coupon is not valid for your cart');
    }

    return {
      coupon: coupon!,
      discountAmount,
      couponSnapshot: {
        id: coupon!.id,
        code: coupon!.code,
        title: coupon!.title,
        discountType: coupon!.discountType,
        discountValue: Number(coupon!.discountValue || 0),
        maxDiscountAmount: Number(coupon!.maxDiscountAmount || 0) || undefined,
        minOrderAmount: Number(coupon!.minOrderAmount || 0) || 0,
      },
    };
  }

  private mapOrderItemEntity(
    item: OrderItemEntity & {barcode?: any},
  ): Order['items'][number] {
    const variantSnapshot = item.variantSnapshot ?? {};
    const barcode = item.barcode;

    return {
      id: item.id,
      orderItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.productNameSnapshot || item.name || '',
      image: item.image || '',
      sku: variantSnapshot.sku || item.sku || '',
      slug: item.slug || '',
      color: variantSnapshot.color,
      colorName: variantSnapshot.colorName,
      size: variantSnapshot.size,
      quantity: item.quantity,
      originalPrice: item.originalPrice,
      price: item.priceSnapshot ?? item.price,
      basePrice: item.basePrice,
      gstRate: item.gstRate,
      cgstRate: item.cgstRate,
      sgstRate: item.sgstRate,
      igstRate: item.igstRate,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      totalAmount: item.totalAmount,
      subtotal: item.subtotal ?? 0,
      productNameSnapshot: item.productNameSnapshot,
      variantSnapshot: item.variantSnapshot,
      priceSnapshot: item.priceSnapshot,
      barcodeId: item.barcodeId,
      barcodeCode: barcode?.code,
      barcodeImageUrl: barcode?.barcodeImageUrl,
      barcodeStatus: barcode?.status,
    };
  }

  private async loadOrderItems(
    orderId: string,
    options?: object,
  ): Promise<Order['items']> {
    const rows = await this.orderItemRepository.find(
      {
        where: {orderId},
        include: [{relation: 'barcode'}],
        order: ['createdAt ASC'],
      },
      options,
    );

    return rows.map(row => this.mapOrderItemEntity(row));
  }

  private async loadOrderItemsForOrders(
    orderIds: string[],
  ): Promise<Map<string, Order['items']>> {
    const grouped = new Map<string, Order['items']>();

    if (!orderIds.length) {
      return grouped;
    }

    const rows = await this.orderItemRepository.find({
      where: {orderId: {inq: orderIds}},
      include: [{relation: 'barcode'}],
      order: ['createdAt ASC'],
    });

    for (const row of rows) {
      const items = grouped.get(row.orderId) ?? [];
      items.push(this.mapOrderItemEntity(row));
      grouped.set(row.orderId, items);
    }

    return grouped;
  }

  private async withOrderItems(
    order: Order,
    options?: object,
  ): Promise<Order> {
    return {
      ...order,
      items: await this.loadOrderItems(order.id, options),
    } as Order;
  }

  private buildVariantSnapshot(item: {
    variantId?: string;
    sku?: string;
    color?: string;
    colorName?: string;
    size?: string;
  }) {
    return {
      variantId: item.variantId,
      sku: item.sku,
      color: item.color,
      colorName: item.colorName,
      size: item.size,
      attributes: {
        color: item.color,
        colorName: item.colorName,
        size: item.size,
      },
    };
  }

  private mapOrderStatusToBarcodeStatus(
    status: Order['status'],
  ): 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'RETURN_REQUESTED' | 'RETURNED' | 'REFUNDED' | null {
    switch (status) {
      case 'packed':
        return 'PACKED';
      case 'shipped':
        return 'SHIPPED';
      case 'delivered':
        return 'DELIVERED';
      case 'return_requested':
        return 'RETURN_REQUESTED';
      case 'returned':
      case 'parcel_received':
        return 'RETURNED';
      case 'refunded':
        return 'REFUNDED';
      default:
        return null;
    }
  }

  private async syncOrderBarcodesForStatus(
    orderId: string,
    orderStatus: Order['status'],
  ): Promise<void> {
    const barcodeStatus = this.mapOrderStatusToBarcodeStatus(orderStatus);

    if (!barcodeStatus) {
      return;
    }

    const orderItems = await this.orderItemRepository.find({
      where: {orderId},
      include: [{relation: 'barcode'}],
    });

    for (const orderItem of orderItems) {
      const barcode = (orderItem as OrderItemEntity & {barcode?: any}).barcode;

      if (!barcode || barcode.status === barcodeStatus) {
        continue;
      }

      await this.barcodeService.updateBarcodeStatus(
        barcode,
        barcodeStatus,
        `Barcode status synced from order status ${orderStatus}`,
        {orderId, orderItemId: orderItem.id},
      );
    }
  }

  private async buildOrderDraft(request: CreateOrderRequest, userId: string) {
    if (!request.cartItems || request.cartItems.length === 0) {
      throw new HttpErrors.BadRequest('Cart is empty');
    }

    const orderItems = [];
    let subtotal = 0;
    let tax = 0;
    const customerState =
      request.shippingAddress?.state || request.billingAddress?.state;
    const sellerState = process.env.COMPANY_STATE || 'Maharashtra';

    for (const item of request.cartItems) {
      if (Number(item.quantity || 0) > MAX_ORDER_ITEM_QUANTITY) {
        throw new HttpErrors.BadRequest(
          `Maximum ${MAX_ORDER_ITEM_QUANTITY} quantity is allowed for a single variant in one order.`,
        );
      }

      const product = await this.productRepository.findById(item.productId);

      if (!product || product.isDeleted) {
        throw new HttpErrors.NotFound(`Product ${item.productId} not found`);
      }

      if (product.status !== 'published') {
        throw new HttpErrors.BadRequest(
          `Product ${product.name} is not available`,
        );
      }

      let availableStock = product.stockQuantity;
      let variantDetails = null;
      let selectedVariant: any = null;
      let variant = null;

      if (item.variantId) {
        variant = await this.productVariantRepository.findById(item.variantId).catch(() => null);

        if (!variant && Array.isArray(product.variants)) {
          variant = product.variants.find(v => v.id === item.variantId) || null;
        }

        if (!variant) {
          throw new HttpErrors.NotFound(
            `Variant ${item.variantId} not found for product ${product.name}`,
          );
        }

        selectedVariant = variant;

        availableStock = variant.stockQuantity;

        variantDetails = {
          variantId: variant.id,
          color: variant.color,
          colorName: variant.colorName,
          size: variant.size,
        };
      }

      if (availableStock < item.quantity) {
        throw new HttpErrors.BadRequest(
          `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`,
        );
      }

      const itemPrice = resolveCheckoutUnitPrice({
        requestedPrice: item.price,
        product,
        variant,
      });
      const itemOriginalPrice = resolveCheckoutOriginalUnitPrice({
        requestedOriginalPrice: item.originalPrice,
        requestedPrice: item.price,
        product,
        variant,
      });

      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;
      const taxBreakup = calculateInclusiveGstBreakup({
        finalUnitPrice: itemPrice,
        quantity: item.quantity,
        sellerState,
        customerState,
      });
      tax += taxBreakup.gstAmount;

      orderItems.push({
        id: uuidv4(),
        productId: product.id,
        orderItemId: undefined,
        name: product.name,
        image:
          selectedVariant?.images?.[0] ||
          product.coverImage ||
          product.images?.[0] ||
          '',
        sku: selectedVariant?.sku || product.sku || '',
        slug: product.slug || '',
        ...variantDetails,
        quantity: item.quantity,
        originalPrice: itemOriginalPrice,
        price: itemPrice,
        basePrice: taxBreakup.basePrice,
        gstRate: taxBreakup.gstRate,
        cgstRate: taxBreakup.cgstRate,
        sgstRate: taxBreakup.sgstRate,
        igstRate: taxBreakup.igstRate,
        cgstAmount: taxBreakup.cgstAmount,
        sgstAmount: taxBreakup.sgstAmount,
        igstAmount: taxBreakup.igstAmount,
        totalAmount: taxBreakup.totalAmount,
        subtotal: itemSubtotal,
        productNameSnapshot: product.name,
        variantSnapshot: this.buildVariantSnapshot({
          variantId: selectedVariant?.id,
          sku: selectedVariant?.sku || product.sku || '',
          color: selectedVariant?.color,
          colorName: selectedVariant?.colorName,
          size: selectedVariant?.size,
        }),
        priceSnapshot: itemPrice,
      });
    }

    const couponApplication = await this.validateAppliedCoupon({
      couponCode: request.couponCode,
      subtotal,
      userId,
      paymentMethod: request.paymentMethod,
    });
    const discount = couponApplication ? couponApplication.discountAmount : 0;
    const shipping = request.shipping || 0;
    tax = Number(roundCurrency(tax));
    const total = subtotal - discount;

    if (subtotal <= 0 || total <= 0) {
      throw new HttpErrors.BadRequest('Invalid order total');
    }

    return {
      orderItems,
      subtotal,
      discount,
      couponApplication,
      shipping,
      tax,
      total: subtotal - discount,
    };
  }

  private async decrementOrderStock(
    orderItems: Array<any>,
    options?: {transaction?: any},
  ) {
    for (const item of orderItems) {
      if (item.variantId) {
        const reserved = await this.productRepository.reserveVariantStockAtomic(
          item.productId,
          item.variantId,
          item.quantity,
          options,
        );

        if (!reserved) {
          throw new HttpErrors.BadRequest(
            `Insufficient stock for ${item.name}. Another order may have just reserved it.`,
          );
        }
        continue;
      }

      const reserved = await this.productRepository.reserveProductStockAtomic(
        item.productId,
        item.quantity,
        options,
      );

      if (!reserved) {
        throw new HttpErrors.BadRequest(
          `Insufficient stock for ${item.name}. Another order may have just reserved it.`,
        );
      }
    }
  }

  private async incrementOrderStock(
    orderItems: Array<any>,
    options?: {transaction?: any},
  ) {
    for (const item of orderItems) {
      const product = await this.productRepository
        .findById(item.productId, undefined, options)
        .catch(() => null);

      if (!product) {
        console.warn(
          `Skipping stock restore. Product ${item.productId} not found for cancelled order item.`,
        );
        continue;
      }

      if (item.variantId) {
        const restored = await this.productRepository.releaseVariantStockAtomic(
          item.productId,
          item.variantId,
          item.quantity,
          options,
        );

        if (restored) {
          continue;
        }

        if (Array.isArray(product.variants) && product.variants.length > 0) {
          const hasVariantInProduct = product.variants.some(
            productVariant => productVariant.id === item.variantId,
          );

          if (hasVariantInProduct) {
            const updatedVariants = product.variants.map(productVariant => {
              if (productVariant.id !== item.variantId) {
                return productVariant;
              }

              const nextStock =
                (productVariant.stockQuantity || 0) + item.quantity;

              return {
                ...productVariant,
                stockQuantity: nextStock,
                inStock: nextStock > 0,
              };
            });

            const totalStock = updatedVariants.reduce(
              (sum, productVariant) =>
                sum + (productVariant.stockQuantity || 0),
              0,
            );

            await this.productRepository.updateById(
              item.productId,
              {
                variants: updatedVariants,
                stockQuantity: totalStock,
                inStock: totalStock > 0,
                updatedAt: new Date(),
              },
              options,
            );
            continue;
          }
        }

        console.warn(
          `Variant ${item.variantId} not found for product ${product.id}. Restoring cancelled quantity to base product stock.`,
        );
      }

      await this.productRepository.releaseProductStockAtomic(
        item.productId,
        item.quantity,
        options,
      );
    }
  }

  private async sendOrderConfirmationEmail(
    order: Order,
    currentUser: UserProfile,
  ) {
    try {
      const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const recipientEmail = order.billingAddress.email || currentUser.email;
      const orderItems = await this.loadOrderItems(order.id);
      const emailHtml = await this.emailTemplateService.renderTemplate(
        'order-confirmation',
        {
          customerName: order.billingAddress.fullName,
          orderNumber: order.orderNumber,
          items: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: formatCurrencyValue(item.price),
          })),
          subtotal: formatCurrencyValue(order.subtotal),
          discount:
            normalizeNumericValue(order.discount) > 0
              ? formatCurrencyValue(order.discount)
              : null,
          shipping: formatCurrencyValue(order.shipping),
          tax: formatCurrencyValue(order.tax),
          total: formatCurrencyValue(order.total),
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          trackOrderUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order.id}/tracking`,
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );

      console.log('[Order Email] Sending order confirmation email', {
        from: fromEmail,
        to: recipientEmail,
        orderNumber: order.orderNumber,
      });

      await this.emailService.sendMail({
        from: fromEmail,
        to: recipientEmail,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }
  }

  private getOrderMailSender(): string {
    return process.env.EMAIL_FROM || process.env.EMAIL_USER || '';
  }

  private getAdminOrderNotificationRecipients(): string[] {
    const configuredRecipients = [
      process.env.ADMIN_ORDER_NOTIFICATION_EMAILS,
      process.env.ADMIN_ORDER_NOTIFICATION_EMAIL,
      process.env.SUPER_ADMIN_EMAIL,
    ]
      .filter(Boolean)
      .flatMap(value => String(value).split(','))
      .map(value => value.trim())
      .filter(Boolean);

    return Array.from(new Set(configuredRecipients));
  }

  private getOrderCustomerEmail(order: Order, fallbackEmail?: string): string {
    return (
      order.billingAddress?.email ||
      order.shippingAddress?.email ||
      fallbackEmail ||
      ''
    );
  }

  private getOrderDetailsUrl(orderId: string): string {
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}`;
  }

  private getOrderTrackingUrl(orderId: string): string {
    return `${this.getOrderDetailsUrl(orderId)}/tracking`;
  }

  private buildEmailAddress(address: Order['shippingAddress']) {
    if (!address) {
      return undefined;
    }

    return {
      ...address,
      addressLine1: (address as any).addressLine1 || address.address,
      addressLine2: (address as any).addressLine2 || '',
      postalCode: (address as any).postalCode || address.zipCode,
    };
  }

  private buildStatusTimeline(order: Order, status: string) {
    const updatedDate = new Date().toLocaleDateString();

    return {
      confirmed: [
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'delivered',
        'return_requested',
        'returned',
        'refunded',
      ].includes(status)
        ? order.createdAt?.toLocaleDateString() || updatedDate
        : null,
      processing: [
        'processing',
        'packed',
        'shipped',
        'delivered',
        'return_requested',
        'returned',
        'refunded',
      ].includes(status)
        ? updatedDate
        : null,
      packed: [
        'packed',
        'shipped',
        'delivered',
        'return_requested',
        'returned',
        'refunded',
      ].includes(status)
        ? updatedDate
        : null,
      shipped: [
        'shipped',
        'delivered',
        'return_requested',
        'returned',
        'refunded',
      ].includes(status)
        ? updatedDate
        : null,
      delivered: [
        'delivered',
        'return_requested',
        'returned',
        'refunded',
      ].includes(status)
        ? order.deliveredAt?.toLocaleDateString() || updatedDate
        : null,
    };
  }

  private isPrepaidOrder(order: Order): boolean {
    return (
      order.paymentMethod === 'razorpay' || order.paymentMethod === 'wallet'
    );
  }

  private async sendAdminStatusUpdateEmail(
    order: Order,
    status: string,
    request: {
      comment?: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    },
    fallbackEmail?: string,
  ): Promise<void> {
    const recipientEmail = this.getOrderCustomerEmail(order, fallbackEmail);

    if (!recipientEmail) {
      console.warn('[Order Email] Skipping status email, no customer email', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
      });
      return;
    }

    const fromEmail = this.getOrderMailSender();
    const customerName = order.billingAddress?.fullName || 'Customer';
    const orderItems = await this.loadOrderItems(order.id);
    const items = orderItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: formatCurrencyValue(item.price),
    }));

    let subject = `Order Update - ${order.orderNumber}`;
    let html = '';

    if (status === 'shipped') {
      html = await this.emailTemplateService.renderTemplate(
        'shipment-notification',
        {
          customerName,
          orderNumber: order.orderNumber,
          trackingNumber:
            order.trackingNumber ||
            request.trackingNumber ||
            'Will be shared soon',
          carrier: order.carrier || request.carrier || 'Our delivery partner',
          shippedDate: new Date().toLocaleDateString(),
          estimatedDelivery:
            order.estimatedDelivery?.toLocaleDateString() ||
            (request.estimatedDelivery
              ? new Date(request.estimatedDelivery).toLocaleDateString()
              : 'Will be updated soon'),
          trackingUrl: this.getOrderTrackingUrl(order.id),
          shippingAddress: this.buildEmailAddress(order.shippingAddress),
          items,
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );
      subject = `Order Shipped - ${order.orderNumber}`;
    } else if (status === 'delivered') {
      html = await this.emailTemplateService.renderTemplate(
        'delivery-confirmation',
        {
          customerName,
          orderNumber: order.orderNumber,
          deliveredDate:
            order.deliveredAt?.toLocaleDateString() ||
            new Date().toLocaleDateString(),
          deliveredTo: order.shippingAddress?.fullName || customerName,
          trackingNumber: order.trackingNumber,
          items,
          reviewUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order.id}/review`,
          returnUrl: `${this.getOrderDetailsUrl(order.id)}/return`,
          orderDetailsUrl: this.getOrderDetailsUrl(order.id),
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );
      subject = `Order Delivered - ${order.orderNumber}`;
    } else if (status === 'refunded') {
      html = await this.emailTemplateService.renderTemplate(
        'refund-completed',
        {
          customerName,
          orderNumber: order.orderNumber,
          refundAmount: formatCurrencyValue(order.refundAmount || order.total),
          refundDate: new Date().toLocaleDateString(),
          transactionId: order.refundTransactionId || 'Will be shared soon',
          refundInitiatedDate:
            order.refundInitiatedAt?.toLocaleDateString() ||
            new Date().toLocaleDateString(),
          refundCompletedDate:
            order.refundCompletedAt?.toLocaleDateString() ||
            new Date().toLocaleDateString(),
          orderDate: order.createdAt?.toLocaleDateString() || 'N/A',
          originalAmount: formatCurrencyValue(order.total),
          refundMethod: 'Original payment method',
          orderDetailsUrl: this.getOrderDetailsUrl(order.id),
          feedbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/feedback`,
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );
      subject = `Refund Processed - ${order.orderNumber}`;
    } else if (status === 'returned') {
      html = await this.emailTemplateService.renderTemplate(
        'order-status-update',
        {
          customerName,
          statusClass: 'delivered',
          statusText: 'Returned',
          orderNumber: order.orderNumber,
          orderDate:
            order.createdAt?.toLocaleDateString() ||
            new Date().toLocaleDateString(),
          total: formatCurrencyValue(order.total),
          comment:
            request.comment ||
            'Your return has been processed successfully by our team.',
          timeline: this.buildStatusTimeline(order, status),
          trackOrderUrl: this.getOrderTrackingUrl(order.id),
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );
      subject = `Order Returned - ${order.orderNumber}`;
    } else {
      return;
    }

    console.log('[Order Email] Sending admin status update email', {
      from: fromEmail,
      to: recipientEmail,
      orderNumber: order.orderNumber,
      status,
    });

    await this.emailService.sendMail({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
    });
  }

  private async sendAdminOrderNotificationEmail(order: Order) {
    try {
      const fromEmail = this.getOrderMailSender();
      const recipients = this.getAdminOrderNotificationRecipients();

      if (!recipients.length) {
        console.warn(
          '[Order Email] No admin notification recipients configured',
          {
            orderNumber: order.orderNumber,
          },
        );
        return;
      }

      const orderItems = await this.loadOrderItems(order.id);
      const emailHtml = await this.emailTemplateService.renderTemplate(
        'admin-new-order-notification',
        {
          customerName: order.billingAddress.fullName,
          customerEmail: order.billingAddress.email || '-',
          customerPhone: order.billingAddress.phone || '-',
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          items: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: formatCurrencyValue(item.price),
          })),
          subtotal: formatCurrencyValue(order.subtotal),
          shipping: formatCurrencyValue(order.shipping),
          tax: formatCurrencyValue(order.tax),
          discount:
            normalizeNumericValue(order.discount) > 0
              ? formatCurrencyValue(order.discount)
              : null,
          total: formatCurrencyValue(order.total),
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          adminOrderUrl: `${process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001'}/orders/${order.id}`,
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );

      console.log('[Order Email] Sending admin order notification email', {
        from: fromEmail,
        to: recipients,
        orderNumber: order.orderNumber,
      });

      await this.emailService.sendMail({
        from: fromEmail,
        to: recipients.join(','),
        subject: `New Order Placed - ${order.orderNumber}`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error(
        'Error sending admin new order notification email:',
        emailError,
      );
    }
  }

  private async sendManualShippingAlertEmail(order: Order, reason: string) {
    try {
      const fromEmail = this.getOrderMailSender();
      const recipients = this.getAdminOrderNotificationRecipients();

      if (!recipients.length) {
        console.warn(
          '[Order Email] No admin notification recipients configured for manual shipping alert',
          {orderNumber: order.orderNumber},
        );
        return;
      }

      const emailHtml = await this.emailTemplateService.renderTemplate(
        'manual-shipping-alert',
        {
          reason,
          customerName: order.billingAddress.fullName,
          customerEmail: order.billingAddress.email || '-',
          customerPhone: order.billingAddress.phone || '-',
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          total: formatCurrencyValue(order.total),
          shippingAddress: order.shippingAddress,
          adminOrderUrl: `${process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001'}/orders/${order.id}`,
        },
      );

      console.log('[Order Email] Sending manual shipping alert email', {
        from: fromEmail,
        to: recipients,
        orderNumber: order.orderNumber,
        reason,
      });

      await this.emailService.sendMail({
        from: fromEmail,
        to: recipients.join(','),
        subject: `Manual Shipping Required - ${order.orderNumber}`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Error sending manual shipping alert email:', emailError);
    }
  }

  private normalizeVerifyPaymentRequest(request: VerifyPaymentRequest) {
    return {
      orderId: request.orderId,
      razorpayOrderId:
        request.razorpayOrderId || request.razorpay_order_id || '',
      razorpayPaymentId:
        request.razorpayPaymentId || request.razorpay_payment_id || '',
      razorpaySignature:
        request.razorpaySignature || request.razorpay_signature || '',
    };
  }

  private buildOrderItemEntities(
    orderId: string,
    orderItems: Array<any>,
  ): Partial<OrderItemEntity>[] {
    return orderItems.map(item => ({
      id: item.id,
      orderId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price,
      basePrice: item.basePrice,
      gstRate: item.gstRate,
      cgstRate: item.cgstRate,
      sgstRate: item.sgstRate,
      igstRate: item.igstRate,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      totalAmount: item.totalAmount,
      name: item.name,
      productNameSnapshot: item.productNameSnapshot || item.name,
      variantSnapshot: item.variantSnapshot,
      priceSnapshot: item.priceSnapshot ?? item.price,
      sku: item.sku,
      image: item.image,
      slug: item.slug,
      originalPrice: item.originalPrice,
      subtotal: item.subtotal,
    }));
  }

  private async createInvoiceRecord(
    order: Order,
    options?: object,
  ): Promise<Invoice> {
    const existingInvoice = await this.invoiceRepository.findOne(
      {
        where: {orderId: order.id},
      },
      options,
    );

    if (existingInvoice) {
      return existingInvoice;
    }

    const invoicePayload = this.invoiceGeneratorService.buildInvoiceRecord(
      await this.withOrderItems(order, options),
    );

    return this.invoiceRepository.create(
      {
        orderId: order.id,
        invoiceNumber: invoicePayload.invoiceNumber,
        totalAmount: invoicePayload.totalAmount,
        taxAmount: invoicePayload.taxAmount,
        pdfUrl: invoicePayload.pdfUrl,
      },
      options,
    );
  }

  private async createInvoiceRecordSafely(
    order: Order,
    options?: object,
  ): Promise<Invoice | null> {
    try {
      return await this.createInvoiceRecord(order, options);
    } catch (error: any) {
      console.error('[Order Invoice] Failed to create invoice record', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount ?? order.total,
        taxAmount: order.tax,
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
      });

      return null;
    }
  }

  private async getOrderWithRelations(
    orderId: string,
    options?: object,
  ): Promise<Order> {
    const order = await this.orderRepository.findById(
      orderId,
      {
        include: [
          {
            relation: 'orderItems',
            scope: {
              include: [{relation: 'barcode'}, {relation: 'variant'}],
            },
          },
          {relation: 'payment'},
          {relation: 'invoice'},
          {relation: 'user'},
        ],
      },
      options,
    );

    return {
      ...order,
      items: (order.orderItems ?? []).map(item =>
        this.mapOrderItemEntity(item as OrderItemEntity),
      ),
    } as Order;
  }

  private async verifyExistingPayment(
    request: VerifyPaymentRequest,
    currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    verified: boolean;
    status: string;
    order: Order;
    invoice: any;
  }> {
    const normalizedRequest = this.normalizeVerifyPaymentRequest(request);
    const userId = currentUser.id;
    const transaction = await this.dataSource.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    let transactionCompleted = false;

    const razorpayPayment = await this.razorpayService.fetchPayment(
      normalizedRequest.razorpayPaymentId,
    );
    const isMatchingPayment =
      razorpayPayment?.order_id === normalizedRequest.razorpayOrderId &&
      razorpayPayment?.id === normalizedRequest.razorpayPaymentId;
    const paymentGatewayStatus = String(
      razorpayPayment?.status || '',
    ).toLowerCase();
    const isCapturedPayment =
      isMatchingPayment && paymentGatewayStatus === 'captured';
    const isPendingPayment =
      isMatchingPayment &&
      ['created', 'authorized', 'pending'].includes(paymentGatewayStatus);

    const isValid = this.razorpayService.verifyPaymentSignature(
      normalizedRequest.razorpayOrderId,
      normalizedRequest.razorpayPaymentId,
      normalizedRequest.razorpaySignature,
    );
    const order = await this.orderRepository.findById(
      normalizedRequest.orderId,
      undefined,
      {transaction},
    );
    const payment = await this.paymentRepository.findOne(
      {where: {orderId: normalizedRequest.orderId}},
      {transaction},
    );
    if (!order) {
      throw new HttpErrors.NotFound('Order not found');
    }

    if (order.userId !== userId) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    if (!payment) {
      throw new HttpErrors.NotFound('Payment record not found for this order');
    }

    try {
      if (
        payment.status === 'success' ||
        order.paymentStatus === 'success' ||
        order.paymentStatus === 'paid'
      ) {
        const existingOrder = await this.getOrderWithRelations(order.id, {
          transaction,
        });
        const invoice = await this.createInvoiceRecordSafely(order, {
          transaction,
        });

        await transaction.commit();

        return {
          success: true,
          verified: true,
          status: 'success',
          order: existingOrder,
          invoice,
        };
      }

      if (!isValid) {
        await this.paymentRepository.updateById(
          payment.id,
          {
            status: 'failed',
            razorpayPaymentId: normalizedRequest.razorpayPaymentId,
            razorpaySignature: normalizedRequest.razorpaySignature,
          },
          {transaction},
        );

        await this.orderRepository.updateById(
          order.id,
          {
            status: 'failed',
            paymentStatus: 'failed',
            razorpayPaymentId: normalizedRequest.razorpayPaymentId,
            razorpaySignature: normalizedRequest.razorpaySignature,
          },
          {transaction},
        );

        await this.orderStatusHistoryRepository.createStatusEntry(
          order.id,
          'failed',
          userId,
          'Payment signature verification failed',
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;
        throw new HttpErrors.BadRequest('Invalid payment signature');
      }

      if (isPendingPayment) {
        await this.paymentRepository.updateById(
          payment.id,
          {
            status: 'pending',
            razorpayOrderId: normalizedRequest.razorpayOrderId,
            razorpayPaymentId: normalizedRequest.razorpayPaymentId,
            razorpaySignature: normalizedRequest.razorpaySignature,
          },
          {transaction},
        );

        await this.orderRepository.updateById(
          order.id,
          {
            status: 'pending',
            paymentStatus: 'pending',
            razorpayOrderId: normalizedRequest.razorpayOrderId,
            razorpayPaymentId: normalizedRequest.razorpayPaymentId,
            razorpaySignature: normalizedRequest.razorpaySignature,
          },
          {transaction},
        );

        await this.orderStatusHistoryRepository.createStatusEntry(
          order.id,
          'pending',
          userId,
          `Payment is ${paymentGatewayStatus} in Razorpay and awaiting capture confirmation`,
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;

        return {
          success: true,
          verified: false,
          status: 'pending',
          order: await this.getOrderWithRelations(order.id),
          invoice: null,
        };
      }

      if (!isCapturedPayment) {
        await this.paymentRepository.updateById(
          payment.id,
          {
            status: 'failed',
            razorpayPaymentId: normalizedRequest.razorpayPaymentId,
            razorpaySignature: normalizedRequest.razorpaySignature,
          },
          {transaction},
        );

        await this.orderRepository.updateById(
          order.id,
          {
            status: 'failed',
            paymentStatus: 'failed',
            razorpayPaymentId: normalizedRequest.razorpayPaymentId,
            razorpaySignature: normalizedRequest.razorpaySignature,
          },
          {transaction},
        );

        await this.orderStatusHistoryRepository.createStatusEntry(
          order.id,
          'failed',
          userId,
          `Unexpected Razorpay payment status: ${paymentGatewayStatus || 'unknown'}`,
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;
        throw new HttpErrors.BadRequest('Payment is not captured by Razorpay');
      }

      await this.paymentRepository.updateById(
        payment.id,
        {
          status: 'success',
          razorpayOrderId: normalizedRequest.razorpayOrderId,
          razorpayPaymentId: normalizedRequest.razorpayPaymentId,
          razorpaySignature: normalizedRequest.razorpaySignature,
        },
        {transaction},
      );

      await this.decrementOrderStock(
        await this.loadOrderItems(order.id, {transaction}),
        {transaction},
      );

      await this.orderRepository.updateById(
        order.id,
        {
          status: 'confirmed',
          paymentStatus: 'success',
          razorpayOrderId: normalizedRequest.razorpayOrderId,
          razorpayPaymentId: normalizedRequest.razorpayPaymentId,
          razorpaySignature: normalizedRequest.razorpaySignature,
        },
        {transaction},
      );

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'confirmed',
        userId,
        'Payment verified and order confirmed',
        {transaction},
      );

      await transaction.commit();
      transactionCompleted = true;

      const updatedOrder = await this.orderRepository.findById(order.id);

      const invoice = await this.createInvoiceRecordSafely(updatedOrder);
      await this.sendOrderConfirmationEmail(updatedOrder, currentUser);
      await this.sendAdminOrderNotificationEmail(updatedOrder);

      return {
        success: true,
        verified: true,
        status: 'success',
        order: await this.getOrderWithRelations(order.id),
        invoice,
      };
    } catch (error) {
      if (!transactionCompleted) {
        await transaction.rollback();
      }

      console.error('error during order id', order?.id);
      console.error('in catch block Error during payment isValid:', isValid);
      console.error(
        'in catch block Error during payment isPendingPayment:',
        isPendingPayment,
      );
      console.error(
        'in catch block Error during payment isCapturedPayment:',
        isCapturedPayment,
      );

      if (!isValid) {
        await this.paymentRepository.updateById(payment.id, {
          status: 'failed',
          razorpayPaymentId: normalizedRequest.razorpayPaymentId,
          razorpaySignature: normalizedRequest.razorpaySignature,
        });
        throw new HttpErrors.BadRequest('Invalid payment signature');
      }

      if (isPendingPayment) {
        await this.paymentRepository.updateById(payment.id, {
          status: 'pending',
          razorpayOrderId: normalizedRequest.razorpayOrderId,
          razorpayPaymentId: normalizedRequest.razorpayPaymentId,
          razorpaySignature: normalizedRequest.razorpaySignature,
        });

        return {
          success: true,
          verified: false,
          status: 'pending',
          order: await this.getOrderWithRelations(order.id),
          invoice: null,
        };
      }

      if (!isCapturedPayment) {
        await this.paymentRepository.updateById(payment.id, {
          status: 'failed',
          razorpayPaymentId: normalizedRequest.razorpayPaymentId,
          razorpaySignature: normalizedRequest.razorpaySignature,
        });

        throw new HttpErrors.BadRequest('Payment is not captured by Razorpay');
      }

      await this.paymentRepository.updateById(payment.id, {
        status: 'success',
        razorpayOrderId: normalizedRequest.razorpayOrderId,
        razorpayPaymentId: normalizedRequest.razorpayPaymentId,
        razorpaySignature: normalizedRequest.razorpaySignature,
      });

      await this.orderRepository.updateById(order.id, {
        status: 'pending',
        paymentStatus: 'success',
        razorpayOrderId: normalizedRequest.razorpayOrderId,
        razorpayPaymentId: normalizedRequest.razorpayPaymentId,
        razorpaySignature: normalizedRequest.razorpaySignature,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'pending',
        userId,
        'Payment captured successfully, but stock reservation failed. Refund review required.',
      );

      throw error;
    }
  }

  @post('/api/payments/failure')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async markPaymentFailure(
    @requestBody()
    request: {
      orderId: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      reason?: string;
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order; payment: Payment | null}> {
    try {
      const order = await this.orderRepository.findById(request.orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      const payment = await this.paymentRepository.findByOrderId(order.id);

      if (payment) {
        await this.paymentRepository.updateById(payment.id, {
          status: 'failed',
          razorpayOrderId: request.razorpayOrderId || payment.razorpayOrderId,
          razorpayPaymentId:
            request.razorpayPaymentId || payment.razorpayPaymentId,
        });
      }

      await this.orderRepository.updateById(order.id, {
        status: 'failed',
        paymentStatus: 'failed',
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'failed',
        currentUser.id,
        request.reason || 'Payment marked as failed',
      );

      return {
        success: true,
        order: await this.getOrderWithRelations(order.id),
        payment: payment
          ? await this.paymentRepository.findById(payment.id)
          : null,
      };
    } catch (error) {
      console.error('Error marking payment failure:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to mark payment failure: ${error.message}`,
      );
    }
  }

  @get('/api/orders/{orderId}/status')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getOrderStatus(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    orderId: string;
    status: string;
    paymentStatus: string;
  }> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      return {
        success: true,
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      };
    } catch (error) {
      console.error('Error fetching order status:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch order status: ${error.message}`,
      );
    }
  }

  /**
   * Serviceability gate for order placement. Applies to prepaid and COD alike;
   * COD additionally requires the pincode to support cash collection.
   *
   * Returns a customer-facing reason to reject, or null to allow. A provider
   * outage returns null (fail open) so that Blue Dart being unreachable cannot
   * stop checkout — the AWB-generation check remains the hard gate.
   */
  private async checkDestinationServiceability(
    request: CreateOrderRequest,
  ): Promise<string | null> {
    const pincode = (request.shippingAddress?.zipCode ?? '').trim();

    if (!/^\d{6}$/.test(pincode) || pincode === '000000') {
      return 'Please enter a valid 6-digit delivery pincode.';
    }

    let serviceability;
    try {
      serviceability = await this.shippingService.checkServiceability({pincode});
    } catch (error) {
      console.error(
        `[OrderController] Serviceability unavailable for pincode ${pincode}; allowing order. Reason:`,
        error.message || error,
      );
      return null;
    }

    if (!serviceability.isServiceable) {
      return `We do not deliver to pincode ${pincode} yet. Please try a different delivery address.`;
    }

    if (request.paymentMethod === 'cod' && !serviceability.isCodAvailable) {
      return `Cash on delivery is not available for pincode ${pincode}. Please choose online payment instead.`;
    }

    return null;
  }

  @post('/api/orders/prepare-payment')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async preparePayment(
    @requestBody() request: CreateOrderRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    orderNumber: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    totals: {
      subtotal: number;
      discount: number;
      shipping: number;
      tax: number;
      total: number;
    };
  }> {
    try {
      if (request.paymentMethod !== 'razorpay') {
        throw new HttpErrors.BadRequest(
          'Prepare payment is only available for Razorpay orders',
        );
      }

      const unserviceableReason =
        await this.checkDestinationServiceability(request);
      if (unserviceableReason) {
        throw new HttpErrors.UnprocessableEntity(unserviceableReason);
      }

      const {subtotal, discount, shipping, tax, total} =
        await this.buildOrderDraft(request, currentUser.id);
      const orderNumber =
        request.orderNumber ||
        (await this.orderRepository.generateOrderNumber(
          process.env.ORDER_PREFIX || 'ORD',
        ));

      const razorpayOrder = await this.razorpayService.createOrder(
        Math.round(total * 100),
        'INR',
        orderNumber,
        {userId: currentUser.id, orderNumber},
      );

      return {
        success: true,
        orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        totals: {subtotal, discount, shipping, tax, total},
      };
    } catch (error) {
      console.error('Error preparing payment:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to prepare payment: ${error.message}`,
      );
    }
  }

  @post('/api/orders/create')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async createOrder(
    @requestBody() request: CreateOrderRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    status: string;
    order: Order;
    orderId: string;
    razorpayOrderId?: string;
    amount?: number;
    currency: string;
    keyId?: string;
    invoice: any;
  }> {
    let transaction: any;
    let transactionCompleted = false;
    try {
      const userId = currentUser.id;

      const unserviceableReason =
        await this.checkDestinationServiceability(request);
      let needsManualShipping = false;
      if (unserviceableReason) {
        // Money already moved on this path; rejecting here would strand a
        // captured payment with no order, so record it and let packing catch it.
        if (request.paymentMethod === 'razorpay' && request.paymentDetails) {
          needsManualShipping = true;
          console.error(
            `[OrderController] Order accepted despite serviceability failure because payment was already captured. Reason: ${unserviceableReason}`,
          );
        } else {
          throw new HttpErrors.UnprocessableEntity(unserviceableReason);
        }
      }

      const {orderItems, subtotal, discount, couponApplication, shipping, tax, total} =
        await this.buildOrderDraft(request, userId);

      const orderNumber =
        request.orderNumber ||
        (await this.orderRepository.generateOrderNumber(
          process.env.ORDER_PREFIX || 'ORD',
        ));

      let razorpayOrderId: string | undefined;
      let paymentStatus: Order['paymentStatus'] =
        request.paymentMethod === 'razorpay' ? 'created' : 'pending';
      let status: Order['status'] =
        request.paymentMethod === 'cod' ? 'confirmed' : 'pending';
      let razorpayPaymentId: string | undefined;
      let razorpaySignature: string | undefined;

      if (request.paymentMethod === 'razorpay' && request.paymentDetails) {
        const isValid = this.razorpayService.verifyPaymentSignature(
          request.paymentDetails.razorpayOrderId,
          request.paymentDetails.razorpayPaymentId,
          request.paymentDetails.razorpaySignature,
        );

        if (!isValid) {
          throw new HttpErrors.BadRequest('Invalid payment signature');
        }

        razorpayOrderId = request.paymentDetails.razorpayOrderId;
        razorpayPaymentId = request.paymentDetails.razorpayPaymentId;
        razorpaySignature = request.paymentDetails.razorpaySignature;
        paymentStatus = 'success';
        status = 'confirmed';
      } else if (request.paymentMethod === 'razorpay') {
        const razorpayOrder = await this.razorpayService.createOrder(
          Math.round(total * 100),
          'INR',
          orderNumber,
          {userId, orderNumber},
        );
        razorpayOrderId = razorpayOrder.id;
      }

      transaction = await this.dataSource.beginTransaction(
        IsolationLevel.READ_COMMITTED,
      );

      const order = await this.orderRepository.create(
        {
          id: uuidv4(),
          orderNumber,
          userId,
          status,
          paymentStatus,
          paymentMethod: request.paymentMethod,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          subtotal,
          discount,
          couponId: couponApplication?.coupon.id,
          couponCode: couponApplication?.coupon.code,
          couponSnapshot: couponApplication?.couponSnapshot,
          shipping,
          tax,
          total,
          totalAmount: total,
          currency: 'INR',
          billingAddress: request.billingAddress,
          shippingAddress: request.shippingAddress,
          items: orderItems,
          needsManualShipping,
          manualShippingReason: needsManualShipping
            ? unserviceableReason ?? undefined
            : undefined,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {transaction},
      );

      const orderItemEntities = this.buildOrderItemEntities(order.id, orderItems);
      const createdOrderItems = await this.orderItemRepository.createAll(
        orderItemEntities,
        {transaction},
      );

      for (const createdOrderItem of createdOrderItems) {
        const barcode = await this.barcodeService.createBarcodeForOrderItem(
          createdOrderItem as OrderItemEntity,
          order,
          {transaction},
        );
        await this.orderItemRepository.updateById(
          createdOrderItem.id,
          {
            barcodeId: barcode.id,
          },
          {transaction},
        );
      }

      let paymentRecord: Payment | null = null;

      if (request.paymentMethod === 'razorpay') {
        paymentRecord = await this.paymentRepository.create(
          {
            orderId: order.id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            amount: total,
            status: request.paymentDetails ? 'success' : 'created',
            method: 'razorpay',
          },
          {transaction},
        );
      }

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        order.status,
        userId,
        request.paymentMethod === 'razorpay' && paymentStatus === 'success'
          ? 'Payment verified and order confirmed'
          : request.paymentMethod === 'cod'
            ? 'COD order created and confirmed'
            : 'Order created and payment initialized',
        {transaction},
      );

      let invoice: Invoice | ReturnType<typeof buildInvoiceFromOrder> =
        buildInvoiceFromOrder(
          await this.withOrderItems(order, {transaction}),
        );

      if (order.status === 'confirmed') {
        console.log(
          '[Order Email] Order is confirmed during createOrder, sending emails',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
          },
        );
        await this.decrementOrderStock(orderItems, {transaction});
      }

      await transaction.commit();
      transactionCompleted = true;

      if (order.status === 'confirmed') {
        if (request.paymentMethod === 'razorpay') {
          invoice = await this.createInvoiceRecord(order);
        }
        await this.sendOrderConfirmationEmail(order, currentUser);
        await this.sendAdminOrderNotificationEmail(order);
        if (needsManualShipping && unserviceableReason) {
          await this.sendManualShippingAlertEmail(order, unserviceableReason);
        }
      } else if (request.paymentMethod === 'razorpay') {
        console.log(
          '[Order Email] Skipping prepaid order emails in createOrder until payment succeeds',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
          },
        );
      } else {
        console.log(
          '[Order Email] Sending admin notification for non-prepaid order creation',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
            adminRecipients: this.getAdminOrderNotificationRecipients(),
          },
        );
        await this.sendAdminOrderNotificationEmail(order);
      }

      return {
        success: true,
        status: order.paymentStatus,
        order: await this.getOrderWithRelations(order.id),
        orderId: order.id,
        razorpayOrderId: paymentRecord?.razorpayOrderId || razorpayOrderId,
        amount: razorpayOrderId ? Math.round(order.total * 100) : undefined,
        currency: order.currency || 'INR',
        keyId: razorpayOrderId ? process.env.RAZORPAY_KEY_ID : undefined,
        invoice,
      };
    } catch (error) {
      if (transaction && !transactionCompleted) {
        await transaction.rollback();
      }
      console.error('Error creating order:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to create order: ${error.message}`,
      );
    }
  }

  @post('/api/orders/verify-payment')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async verifyPayment(
    @requestBody()
    request: VerifyPaymentRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    verified: boolean;
    status: string;
    order: Order;
    invoice: any;
  }> {
    try {
      return this.verifyExistingPayment(request, currentUser);
    } catch (error) {
      console.error('Error verifying payment:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to verify payment: ${error.message}`,
      );
    }
  }

  @post('/api/payments/verify')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async verifyPaymentAlias(
    @requestBody() request: VerifyPaymentRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    verified: boolean;
    status: string;
    order: Order;
    invoice: any;
  }> {
    try {
      return this.verifyExistingPayment(request, currentUser);
    } catch (error) {
      console.error('Error verifying payment via alias endpoint:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to verify payment: ${error.message}`,
      );
    }
  }

  @get('/api/orders/user/{userId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getUserOrders(
    @param.path.string('userId') userId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.number('page') page: number = 1,
    @param.query.number('limit') limit: number = 20,
    @param.query.string('status') status?: string,
  ): Promise<{
    success: boolean;
    orders: Order[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      if (currentUser.id !== userId) {
        throw new HttpErrors.Forbidden('You can only access your own orders');
      }

      const skip = (page - 1) * limit;
      const where: any = {userId, isDeleted: false};

      if (status) {
        where.status = status;
      }

      const [orders, total] = await Promise.all([
        this.orderRepository.find({
          where,
          limit,
          skip,
          order: ['createdAt DESC'],
        }),
        this.orderRepository.count(where),
      ]);

      const totalPages = Math.ceil(total.count / limit);
      const itemsByOrderId = await this.loadOrderItemsForOrders(
        orders.map(order => order.id),
      );
      const ordersWithItems = orders.map(
        order =>
          ({
            ...order,
            items: itemsByOrderId.get(order.id) ?? [],
          }) as Order,
      );

      return {
        success: true,
        orders: ordersWithItems,
        pagination: {
          total: total.count,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch orders: ${error.message}`,
      );
    }
  }

  @get('/api/order-history')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getOrderHistory(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.number('page') page = 1,
    @param.query.number('limit') limit = 10,
  ): Promise<{
    success: boolean;
    entries: Array<{
      type: 'standard' | 'premium';
      order?: Order;
      preorder?: PremiumPreorder;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    try {
      const userId = currentUser.id;
      const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
      const safePage = Math.max(Number(page) || 1, 1);
      const skip = (safePage - 1) * safeLimit;

      // Orders and preorders are separate tables shown as one date-sorted list,
      // so the page has to be selected across both before either is hydrated.
      const notDeleted = 'COALESCE(isdeleted, false) = false';
      const pageRows = (await this.dataSource.execute(
        `SELECT id::text AS id, type FROM (
           SELECT id, 'standard' AS type, createdat FROM public.orders
             WHERE userid = $1 AND ${notDeleted}
           UNION ALL
           SELECT id, 'premium' AS type, createdat FROM public.premium_preorders
             WHERE userid = $1 AND ${notDeleted}
         ) merged
         ORDER BY createdat DESC
         LIMIT $2 OFFSET $3`,
        [userId, safeLimit, skip],
      )) as Array<{id: string; type: 'standard' | 'premium'}>;

      const countRows = (await this.dataSource.execute(
        `SELECT (
           (SELECT COUNT(*) FROM public.orders
              WHERE userid = $1 AND ${notDeleted}) +
           (SELECT COUNT(*) FROM public.premium_preorders
              WHERE userid = $1 AND ${notDeleted})
         )::int AS total`,
        [userId],
      )) as Array<{total: number}>;

      const total = countRows?.[0]?.total ?? 0;
      const orderIds = pageRows
        .filter(row => row.type === 'standard')
        .map(row => row.id);
      const preorderIds = pageRows
        .filter(row => row.type === 'premium')
        .map(row => row.id);

      const [orders, preorders, itemsByOrderId] = await Promise.all([
        orderIds.length
          ? this.orderRepository.find({where: {id: {inq: orderIds}}})
          : Promise.resolve([]),
        preorderIds.length
          ? this.premiumPreorderRepository.find({
              where: {id: {inq: preorderIds}},
              include: [{relation: 'product'}],
            })
          : Promise.resolve([]),
        this.loadOrderItemsForOrders(orderIds),
      ]);

      const orderById = new Map(
        orders.map(order => [
          order.id,
          {...order, items: itemsByOrderId.get(order.id) ?? []} as Order,
        ]),
      );
      const preorderById = new Map(
        preorders.map(preorder => [preorder.id, preorder]),
      );

      const entries = pageRows
        .map(row =>
          row.type === 'standard'
            ? {type: row.type, order: orderById.get(row.id)}
            : {type: row.type, preorder: preorderById.get(row.id)},
        )
        .filter(entry => entry.order ?? entry.preorder);

      return {
        success: true,
        entries,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit),
          hasMore: skip + pageRows.length < total,
        },
      };
    } catch (error) {
      console.error('Error fetching order history:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch order history: ${error.message}`,
      );
    }
  }

  @get('/api/orders/{orderId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getOrderDetails(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    order: Order;
    statusHistory: any[];
    invoice: any;
  }> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      const statusHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId},
        order: ['createdAt DESC'],
        include: [{relation: 'changedByUser'}],
      });

      const orderWithItems = await this.withOrderItems(order);

      return {
        success: true,
        order: orderWithItems,
        statusHistory,
        invoice: buildInvoiceFromOrder(orderWithItems),
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch order details: ${error.message}`,
      );
    }
  }

  @get('/api/orders/{orderId}/invoice')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getOrderInvoice(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; invoice: any; orderId: string}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      return {
        success: true,
        orderId: order.id,
        invoice: buildInvoiceFromOrder(await this.withOrderItems(order)),
      };
    } catch (error) {
      console.error('Error fetching order invoice:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch invoice: ${error.message}`,
      );
    }
  }

  private sendHtml(response: Response, html: string): Response {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.send(html);
    return response;
  }

  private async buildOrderBarcodeDataUri(
    orderNumber: string,
  ): Promise<string | undefined> {
    try {
      const buffer = await this.barcodeService.renderBarcodeBuffer(orderNumber);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.error('Error rendering order barcode:', error);
      return undefined;
    }
  }

  @get('/api/orders/{orderId}/invoice/print')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getCustomerInvoiceHtml(
    @param.path.string('orderId') orderId: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.boolean('autoPrint') autoPrint = false,
  ): Promise<Response> {
    const order = await this.orderRepository.findById(orderId);

    if (order.userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    const withItems = await this.withOrderItems(order);
    const invoice = buildInvoiceFromOrder(withItems);

    return this.sendHtml(
      response,
      this.invoicePrintService.buildInvoiceHtml(withItems, invoice, autoPrint),
    );
  }

  @get('/api/admin/orders/{orderId}/invoice/print')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getAdminInvoiceHtml(
    @param.path.string('orderId') orderId: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Response> {
    const order = await this.orderRepository.findById(orderId);
    const withItems = await this.withOrderItems(order);
    const invoice = buildInvoiceFromOrder(withItems);

    return this.sendHtml(
      response,
      this.invoicePrintService.buildInvoiceHtml(withItems, invoice),
    );
  }

  @get('/api/admin/orders/{orderId}/shipping-label/print')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async getAdminShippingLabelHtml(
    @param.path.string('orderId') orderId: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Response> {
    const order = await this.orderRepository.findById(orderId);
    const withItems = await this.withOrderItems(order);
    const invoice = buildInvoiceFromOrder(withItems);

    return this.sendHtml(
      response,
      this.invoicePrintService.buildShippingLabelHtml(withItems, invoice, {
        awbNumber: order.trackingNumber,
        barcodeDataUri: await this.buildOrderBarcodeDataUri(order.orderNumber),
      }),
    );
  }

  @get('/api/orders/{orderId}/tracking')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getOrderTracking(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{
    success: boolean;
    tracking: {
      orderNumber: string;
      status: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: Date;
      shippingAddress: any;
      events: any[];
      shipment?: {
        awbNumber: string;
        status: string;
        currentLocation?: string;
        courierEvents: any[];
        isCod: boolean;
        isReverse: boolean;
      };
    };
  }> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      const statusHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId},
        order: ['createdAt ASC'],
        include: [{relation: 'changedByUser'}],
      });

      const events = statusHistory.map(history => ({
        status: history.status,
        comment: history.comment,
        timestamp: history.createdAt,
      }));

      // Fetch primary forward active shipment
      let shipment = await this.shipmentRepository.findOne({
        where: {orderId, isReverse: false, status: {neq: 'cancelled'}},
        include: [{relation: 'events'}],
      });

      if (shipment) {
        const cacheTtlMinutes = Number(process.env.TRACKING_CACHE_TTL_MINUTES || '15');
        const isStale =
          !shipment.trackingLastSyncedAt ||
          Date.now() - new Date(shipment.trackingLastSyncedAt).getTime() > cacheTtlMinutes * 60 * 1000;

        if (isStale) {
          try {
            const tracking = await this.shippingService.trackShipment(shipment.awbNumber);
            await this.shipmentRepository.updateById(shipment.id, {
              status: tracking.currentStatus,
              currentLocation: tracking.currentLocation,
              deliveredAt: tracking.deliveredAt,
              trackingLastSyncedAt: new Date(),
              rawTrackingData: tracking.rawResponse as object,
              updatedAt: new Date(),
            });

            // Upsert events
            for (const ev of tracking.events) {
              const existingEvent = await this.orderRepository.dataSource.execute(
                `SELECT id FROM public.shipment_events WHERE shipmentid = $1 AND courierrawcode = $2 AND timestamp = $3 LIMIT 1`,
                [shipment.id, ev.courierRawCode, ev.timestamp],
              );

              if (existingEvent.length === 0) {
                await this.orderRepository.dataSource.execute(
                  `INSERT INTO public.shipment_events (id, shipmentid, internalstatus, courierrawcode, courierdescription, description, location, timestamp, createdat) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
                  [shipment.id, ev.internalStatus, ev.courierRawCode, ev.courierDescription, ev.description, ev.location, ev.timestamp],
                );
              }
            }

            // Reload shipment
            shipment = await this.shipmentRepository.findById(shipment.id, {
              include: [{relation: 'events'}],
            });
          } catch (syncErr) {
            console.error('[OrderController] Failed to auto-sync tracking for customer request:', syncErr.message || syncErr);
          }
        }
      }

      const shipmentDetails = shipment
        ? {
            awbNumber: shipment.awbNumber,
            status: shipment.status,
            currentLocation: shipment.currentLocation,
            isCod: shipment.isCod,
            isReverse: shipment.isReverse,
            courierEvents: (shipment.events || []).map(e => ({
              description: e.description,
              location: e.location,
              timestamp: e.timestamp,
              internalStatus: e.internalStatus,
            })),
          }
        : undefined;

      return {
        success: true,
        tracking: {
          orderNumber: order.orderNumber,
          status: order.status,
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          estimatedDelivery: order.estimatedDelivery,
          shippingAddress: order.shippingAddress,
          events,
          shipment: shipmentDetails,
        },
      };
    } catch (error) {
      console.error('Error fetching order tracking:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch tracking: ${error.message}`,
      );
    }
  }

  @post('/api/orders/{orderId}/cancel')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async cancelOrder(
    @param.path.string('orderId') orderId: string,
    @requestBody() request: {reason: string},
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      const cancellableStatuses = ['pending', 'confirmed', 'packed', 'shipped'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new HttpErrors.BadRequest(
          `Cannot cancel order with status '${order.status}'. Allowed: ${cancellableStatuses.join(', ')}`,
        );
      }

      // Check for active shipments
      const activeShipment = await this.shipmentRepository.findOne({
        where: {orderId: order.id, status: {neq: 'cancelled'}},
      });

      if (activeShipment) {
        // Order status turns 'shipped' when the AWB is generated, which is before
        // the courier physically collects the parcel. Only the shipment status
        // tells us whether it has actually left, so the gate reads that instead.
        if (!COURIER_CANCELLABLE_SHIPMENT_STATES.includes(activeShipment.status)) {
          throw new HttpErrors.Conflict(
            'This order has already been collected by our courier and can no longer be cancelled. You can refuse the delivery when it arrives, or request a return once it has been delivered.',
          );
        }

        // Our shipment status can be up to one tracking-sync interval stale, so
        // the courier's answer — not the row above — decides the outcome.
        let cancelRes;
        try {
          cancelRes = await this.shippingService.cancelShipment(activeShipment.awbNumber);
        } catch (err) {
          await this.shipmentRepository.updateById(activeShipment.id, {
            status: 'cancel_pending',
            cancellationReason: 'Network error during cancellation: ' + err.message,
            updatedAt: new Date(),
          });
          throw new HttpErrors.BadGateway(
            'We could not reach our courier to cancel this shipment. Your order has not been cancelled and you have not been charged any cancellation fee. Please try again in a few minutes.',
          );
        }

        if (!cancelRes.success) {
          await this.shipmentRepository.updateById(activeShipment.id, {
            status: 'cancel_pending',
            cancellationReason: 'Courier rejected cancellation: ' + cancelRes.message,
            updatedAt: new Date(),
          });
          throw new HttpErrors.Conflict(
            'Our courier could not cancel this shipment because it has already been collected. Your order has not been cancelled. You can refuse the delivery when it arrives, or request a return once it has been delivered.',
          );
        }

        await this.shipmentRepository.updateById(activeShipment.id, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Order cancelled by customer',
          updatedAt: new Date(),
        });
      }

      await this.orderRepository.updateById(order.id, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: request.reason,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'cancelled',
        currentUser.id,
        `Order cancelled by user. Reason: ${request.reason}`,
      );

      if (order.paymentStatus === 'paid' && order.razorpayPaymentId) {
        try {
          const refund = await this.razorpayService.createRefund(
            order.razorpayPaymentId,
            Math.round(order.total * 100),
            {reason: request.reason, orderId: order.id},
          );

          await this.orderRepository.updateById(order.id, {
            refundAmount: order.total,
            refundInitiatedAt: new Date(),
            refundTransactionId: refund.id,
          });
        } catch (refundError) {
          console.error('Error initiating refund:', refundError);
        }
      }

      const cancelledOrderItems = await this.loadOrderItems(order.id);

      if (activeShipment) {
        await this.inventoryLifecycleService.restoreOnVoidedShipment(order.id, currentUser.id, currentUser.email);
      } else if (order.status === 'confirmed' || order.status === 'packed') {
        await this.inventoryLifecycleService.releaseReservationOnCancellation(order.id, currentUser.id, currentUser.email);
      }

      try {
        const emailHtml = await this.emailTemplateService.renderTemplate(
          'cancellation-confirmation',
          {
            customerName: order.billingAddress.fullName,
            orderNumber: order.orderNumber,
            cancellationReason: request.reason,
            orderDate: order.createdAt
              ? order.createdAt.toLocaleDateString()
              : new Date().toLocaleDateString(),
            items: cancelledOrderItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: formatCurrencyValue(item.price),
            })),
            total: formatCurrencyValue(order.total),
            refundAmount:
              order.paymentStatus === 'paid'
                ? formatCurrencyValue(order.total)
                : null,
            refundProcessingDays: '5-7',
            year: new Date().getFullYear(),
            companyName: 'Valiarian',
          },
        );

        await this.emailService.sendMail({
          to: order.billingAddress.email || currentUser.email,
          subject: `Order Cancelled - ${order.orderNumber}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
      }

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, order: updatedOrder};
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to cancel order: ${error.message}`,
      );
    }
  }

  @post('/api/orders/{orderId}/return')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async returnOrder(
    @param.path.string('orderId') orderId: string,
    @requestBody()
    request: {
      reason: string;
      comment: string;
      images: {
        frontImage: string;
        backImage: string;
        sealImage: string;
        additionalImages?: string[];
      };
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== currentUser.id) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      if (order.status !== 'delivered') {
        throw new HttpErrors.BadRequest(
          'Only delivered orders can be returned',
        );
      }

      if (order.returnStatus) {
        throw new HttpErrors.BadRequest(
          'A return request already exists for this order',
        );
      }

      const reason = request.reason?.trim();
      const comment = request.comment?.trim();
      const frontImage = request.images?.frontImage?.trim();
      const backImage = request.images?.backImage?.trim();
      const sealImage = request.images?.sealImage?.trim();
      const additionalImages = (request.images?.additionalImages || [])
        .map(image => String(image).trim())
        .filter(Boolean);

      if (!reason) {
        throw new HttpErrors.BadRequest('Return reason is required');
      }

      if (!comment) {
        throw new HttpErrors.BadRequest('Return comment is required');
      }

      if (!frontImage || !backImage || !sealImage) {
        throw new HttpErrors.BadRequest(
          'Front image, back image, and seal image are required for a return request',
        );
      }

      if (additionalImages.length > 5) {
        throw new HttpErrors.BadRequest(
          'You can upload up to 5 additional images only',
        );
      }

      if (!order.deliveredAt) {
        throw new HttpErrors.BadRequest('Order delivery date not found');
      }

      const returnWindowDays = parseInt(
        process.env.RETURN_WINDOW_DAYS || '3',
        10,
      );
      const returnWindowMs = returnWindowDays * 24 * 60 * 60 * 1000;
      const deliveryTime = new Date(order.deliveredAt).getTime();
      const currentTime = new Date().getTime();

      if (currentTime - deliveryTime > returnWindowMs) {
        throw new HttpErrors.BadRequest(
          `The 72-hour return window has expired. Order was delivered on ${new Date(
            order.deliveredAt,
          ).toLocaleDateString()}.`,
        );
      }

      await this.orderRepository.updateById(order.id, {
        status: 'return_requested',
        returnStatus: 'requested',
        returnInitiatedAt: new Date(),
        returnReason: reason,
        returnComment: comment,
        returnImages: {
          frontImage,
          backImage,
          sealImage,
          additionalImages,
        },
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'return_requested',
        currentUser.id,
        `Return requested. Reason: ${reason}. Comment: ${comment}`,
      );

      try {
        const emailHtml = await this.emailTemplateService.renderTemplate(
          'return-request-received',
          {
            customerName: order.billingAddress.fullName,
            orderNumber: order.orderNumber,
            returnReason: reason,
            orderDate: order.createdAt
              ? order.createdAt.toLocaleDateString()
              : new Date().toLocaleDateString(),
            deliveryDate: order.deliveredAt?.toLocaleDateString(),
            items: (await this.loadOrderItems(order.id)).map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: formatCurrencyValue(item.price),
            })),
            total: formatCurrencyValue(order.total),
            processingTime: '24-48 hours',
            year: new Date().getFullYear(),
            companyName: 'Valiarian',
          },
        );

        await this.emailService.sendMail({
          to: order.billingAddress.email || currentUser.email,
          subject: `Return Request Received - ${order.orderNumber}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Error sending return request email:', emailError);
      }

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, order: updatedOrder};
    } catch (error) {
      console.error('Error processing return request:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to process return: ${error.message}`,
      );
    }
  }

  @get('/api/admin/orders')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async adminGetAllOrders(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.number('page') page: number = 1,
    @param.query.number('limit') limit: number = 20,
    @param.query.string('status') status?: string,
    @param.query.string('paymentStatus') paymentStatus?: string,
    @param.query.string('search') search?: string,
    @param.query.string('sortBy') sortBy: string = 'createdAt',
    @param.query.string('sortOrder') sortOrder: string = 'desc',
  ): Promise<{
    success: boolean;
    orders: any[];
    counts: Record<string, number>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const skip = (page - 1) * limit;
      const where: any = {isDeleted: false};

      if (status) {
        where.status = status;
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }

      if (search) {
        where.or = [{orderNumber: {like: `%${search}%`, options: 'i'}}];
      }

      const orderClause = [`${sortBy} ${sortOrder.toUpperCase()}`];

      const [orders, total] = await Promise.all([
        this.orderRepository.find({
          where,
          limit,
          skip,
          order: orderClause,
          include: [{relation: 'user'}],
        }),
        this.orderRepository.count(where),
      ]);
      const statuses: Order['status'][] = [
        'pending',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
        'refunded',
        'parcel_received',
      ];
      const countResults = await Promise.all(
        statuses.map(orderStatus =>
          this.orderRepository.count({
            isDeleted: false,
            ...(paymentStatus
              ? {paymentStatus: paymentStatus as Order['paymentStatus']}
              : {}),
            ...(search
              ? {or: [{orderNumber: {like: `%${search}%`, options: 'i'}}]}
              : {}),
            status: orderStatus,
          }),
        ),
      );

      const totalPages = Math.ceil(total.count / limit);
      const itemsByOrderId = await this.loadOrderItemsForOrders(
        orders.map(order => order.id),
      );
      const ordersWithItems = orders.map(order => ({
        ...order,
        items: itemsByOrderId.get(order.id) ?? [],
      }));

      return {
        success: true,
        orders: ordersWithItems,
        counts: {
          all: total.count,
          ...statuses.reduce<Record<string, number>>(
            (acc, orderStatus, index) => {
              acc[orderStatus] = countResults[index].count;
              return acc;
            },
            {},
          ),
        },
        pagination: {
          total: total.count,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch orders: ${error.message}`,
      );
    }
  }

  @get('/api/admin/orders/{orderId}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async adminGetOrderDetails(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: any; statusHistory: any[]}> {
    try {
      console.log(`[Admin] Fetching order details for ID: ${orderId}`);

      const order = await this.orderRepository.findById(orderId, {
        include: [
          {relation: 'user'},
          {
            relation: 'orderItems',
            scope: {
              include: [{relation: 'barcode'}, {relation: 'variant'}],
            },
          },
        ],
      });

      if (!order) {
        console.error(`[Admin] Order not found: ${orderId}`);
        throw new HttpErrors.NotFound('Order not found');
      }

      console.log(`[Admin] Order found: ${order.orderNumber}`);

      const statusHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId},
        order: ['createdAt DESC'],
        include: [{relation: 'changedByUser'}],
      });

      console.log(`[Admin] Status history entries: ${statusHistory.length}`);

      const orderWithItems = {
        ...order,
        items: (order.orderItems ?? []).map(item =>
          this.mapOrderItemEntity(item as OrderItemEntity),
        ),
      };

      return {success: true, order: orderWithItems, statusHistory};
    } catch (error) {
      console.error('Error fetching admin order details:', error);

      // Log available orders for debugging
      if (error.message?.includes('Entity not found')) {
        try {
          const allOrders = await this.orderRepository.find({
            fields: ['id', 'orderNumber'],
            limit: 10,
          });
          console.log(
            '[Admin] Available order IDs:',
            allOrders.map(o => ({
              id: o.id,
              orderNumber: o.orderNumber,
            })),
          );
        } catch (listError) {
          console.error('[Admin] Could not list available orders:', listError);
        }
      }

      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to fetch order details: ${error.message}`,
      );
    }
  }

  @patch('/api/admin/orders/{orderId}/status')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async adminUpdateOrderStatus(
    @param.path.string('orderId') orderId: string,
    @requestBody()
    request: {
      status: string;
      comment?: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order}> {
    try {
      console.log(`[Admin] Updating order ${orderId} status:`, request);

      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        console.error(`[Admin] Order not found: ${orderId}`);
        throw new HttpErrors.NotFound('Order not found');
      }

      console.log(`[Admin] Current order status: ${order.status}`);
      console.log(`[Admin] Requested new status: ${request.status}`);

      const validStatuses = [
        'pending',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
        'refunded',
        'parcel_received',
      ];

      if (!validStatuses.includes(request.status)) {
        console.error(`[Admin] Invalid status: ${request.status}`);
        throw new HttpErrors.BadRequest(`Invalid status: ${request.status}`);
      }

      // 'out_for_delivery' is normally set automatically by the tracking-sync
      // cron when Blue Dart reports it (see TrackingSyncCronJob) — this manual
      // path exists as a fallback for when that sync hasn't run yet or the
      // courier feed is delayed.
      const statusTransitions: any = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['packed', 'cancelled'],
        packed: ['shipped', 'cancelled'],
        shipped: ['out_for_delivery', 'delivered'],
        out_for_delivery: ['delivered'],
        delivered: ['return_requested'],
        return_requested: ['returned'],
        cancelled: ['refunded'],
        returned: ['parcel_received'],
        refunded: ['parcel_received'],
        parcel_received: ['refunded'],
      };

      const statusChanged = order.status !== request.status;

      if (
        statusChanged &&
        !statusTransitions[order.status]?.includes(request.status)
      ) {
        console.error(
          `[Admin] Invalid transition from '${order.status}' to '${request.status}'`,
        );
        console.error(
          `[Admin] Allowed transitions from '${order.status}':`,
          statusTransitions[order.status],
        );
        throw new HttpErrors.BadRequest(
          `Cannot transition from '${order.status}' to '${request.status}'. Allowed transitions: ${statusTransitions[order.status]?.join(', ') || 'none'}`,
        );
      }

      if (
        statusChanged &&
        request.status === 'returned' &&
        order.returnStatus !== 'approved'
      ) {
        throw new HttpErrors.BadRequest(
          'Return pickup can only be marked after the return request is approved.',
        );
      }

      if (
        statusChanged &&
        request.status === 'parcel_received' &&
        order.returnStatus !== 'picked'
      ) {
        throw new HttpErrors.BadRequest(
          'Parcel can only be marked as received after the return pickup is completed.',
        );
      }

      if (statusChanged && request.status === 'refunded') {
        if (order.status === 'cancelled' && !this.isPrepaidOrder(order)) {
          throw new HttpErrors.BadRequest(
            'Cancelled COD orders cannot be marked as refunded because no online payment was collected.',
          );
        }

        if (
          order.status === 'return_requested' ||
          ['requested', 'approved'].includes(order.returnStatus || '')
        ) {
          throw new HttpErrors.BadRequest(
            'Refund can only be completed after the return is marked returned or parcel received.',
          );
        }
      }

      console.log(`[Admin] Status transition valid`);

      const updateData: any = {
        status: request.status,
        updatedAt: new Date(),
      };

      if (request.trackingNumber) {
        updateData.trackingNumber = request.trackingNumber;
      }

      if (request.carrier) {
        updateData.carrier = request.carrier;
      }

      if (request.estimatedDelivery) {
        updateData.estimatedDelivery = new Date(request.estimatedDelivery);
      }

      if (request.status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      if (request.status === 'cancelled') {
        updateData.cancelledAt = order.cancelledAt || new Date();
      }

      if (request.status === 'refunded') {
        updateData.paymentStatus = 'refunded';
        updateData.refundCompletedAt = new Date();
        updateData.refundInitiatedAt = order.refundInitiatedAt || new Date();
        updateData.refundAmount =
          normalizeNumericValue(order.refundAmount) || order.total;
        updateData.refundMethod =
          order.refundMethod ||
          (this.isPrepaidOrder(order) ? 'original_payment' : 'cash');
      }

      if (request.status === 'parcel_received') {
        updateData.parcelReceivedAt = order.parcelReceivedAt || new Date();
        updateData.returnStatus = 'completed';
      }

      if (request.status === 'returned') {
        updateData.returnStatus = 'picked';
        updateData.returnPickedAt = order.returnPickedAt || new Date();
      }

      console.log(`[Admin] Updating order with data:`, updateData);

      await this.orderRepository.updateById(order.id, updateData);
      if (
        statusChanged &&
        request.status === 'cancelled' &&
        order.status !== 'pending'
      ) {
        await this.incrementOrderStock(await this.loadOrderItems(order.id));
        console.log(`[Admin] Stock restored for cancelled order`);
      }
      if (statusChanged && request.status === 'parcel_received') {
        await this.incrementOrderStock(await this.loadOrderItems(order.id));
        console.log(`[Admin] Stock restored for received parcel`);
      }
      console.log(`[Admin] ✅ Order updated in database`);

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        request.status,
        currentUser.id,
        request.comment || `Status updated to ${request.status} by admin`,
      );

      console.log(`[Admin] ✅ Status history entry created`);

      console.log(`[Admin] Fetching updated order...`);
      const updatedOrder = await this.orderRepository.findById(order.id);
      if (statusChanged) {
        await this.syncOrderBarcodesForStatus(order.id, request.status as Order['status']);
      }
      console.log(`[Admin] Updated order fetched successfully`);

      if (statusChanged) {
        try {
          await this.sendAdminStatusUpdateEmail(
            updatedOrder,
            request.status,
            request,
          );
        } catch (emailError) {
          console.error(
            `[Admin] Error sending customer status email for ${request.status}:`,
            emailError,
          );
        }
      }

      console.log(`[Admin] Returning success response`);
      return {success: true, order: updatedOrder};
    } catch (error) {
      console.error('❌❌❌ ERROR UPDATING ORDER STATUS ❌❌❌');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      if (error instanceof HttpErrors.HttpError) {
        console.error('HTTP Error - Status Code:', error.statusCode);
        console.error('HTTP Error - Message:', error.message);
        throw error;
      }

      console.error(
        'Throwing InternalServerError with message:',
        error.message,
      );
      throw new HttpErrors.InternalServerError(
        `Failed to update order status: ${error.message}`,
      );
    }
  }

  @patch('/api/admin/orders/{orderId}/return')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async adminProcessReturn(
    @param.path.string('orderId') orderId: string,
    @requestBody() request: {action: 'approve' | 'reject'; comment?: string},
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.returnStatus !== 'requested') {
        throw new HttpErrors.BadRequest(
          `Cannot process return. Current return status: ${order.returnStatus || 'none'}`,
        );
      }

      if (!['approve', 'reject'].includes(request.action)) {
        throw new HttpErrors.BadRequest(
          'Action must be either "approve" or "reject"',
        );
      }

      const newReturnStatus =
        request.action === 'approve' ? 'approved' : 'rejected';
      const returnOrderItems = await this.loadOrderItems(order.id);

      await this.orderRepository.updateById(order.id, {
        status: request.action === 'reject' ? 'delivered' : order.status,
        returnStatus: newReturnStatus,
        returnApprovedAt:
          request.action === 'approve'
            ? order.returnApprovedAt || new Date()
            : undefined,
        refundMethod:
          request.action === 'approve'
            ? this.isPrepaidOrder(order)
              ? 'original_payment'
              : 'cash'
            : order.refundMethod,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        request.action === 'approve' ? 'return_approved' : 'return_rejected',
        currentUser.id,
        request.comment || `Return ${request.action}d by admin`,
      );

      try {
        if (request.action === 'approve') {
          const frontendUrl = (
            process.env.FRONTEND_URL || 'http://localhost:3000'
          ).replace(/\/$/, '');
          const emailHtml = await this.emailTemplateService.renderTemplate(
            'return-approved',
            {
              customerName: order.billingAddress.fullName,
              orderNumber: order.orderNumber,
              returnRequestId: order.id,
              approvedDate: new Date().toLocaleDateString(),
              items: returnOrderItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
              })),
              refundAmount: formatCurrencyValue(order.total),
              comment:
                request.comment ||
                'Please keep the product packed safely with all original accessories for the pickup.',
              returnStatusUrl: `${frontendUrl}/orders/${order.id}`,
              year: new Date().getFullYear(),
              companyName: 'Valiarian',
            },
          );

          await this.emailService.sendMail({
            to: order.billingAddress.email || currentUser.email,
            subject: `Return Approved - ${order.orderNumber}`,
            html: emailHtml,
          });
        } else {
          const emailHtml = await this.emailTemplateService.renderTemplate(
            'return-rejected',
            {
              customerName: order.billingAddress.fullName,
              orderNumber: order.orderNumber,
              rejectionDate: new Date().toLocaleDateString(),
              returnReason: order.returnReason || 'Not specified',
              rejectionReason:
                request.comment ||
                'Return request does not meet our return policy criteria.',
              items: returnOrderItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
              })),
              year: new Date().getFullYear(),
              companyName: 'Valiarian',
            },
          );

          await this.emailService.sendMail({
            to: order.billingAddress.email,
            subject: `Return Request Rejected - ${order.orderNumber}`,
            html: emailHtml,
          });
        }
      } catch (emailError) {
        console.error('Error sending return status email:', emailError);
      }

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, order: updatedOrder};
    } catch (error) {
      console.error('Error processing return:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to process return: ${error.message}`,
      );
    }
  }

  @post('/api/admin/orders/{orderId}/refund')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async adminInitiateRefund(
    @param.path.string('orderId') orderId: string,
    @requestBody()
    request: {
      amount: number;
      reason: string;
      deductDeliveryCharge?: boolean;
      deliveryChargeDeductionAmount?: number;
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order; refund: any}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (
        !['cancelled', 'returned', 'parcel_received'].includes(order.status)
      ) {
        throw new HttpErrors.BadRequest(
          'Refund can only be initiated for cancelled prepaid orders or after the return is marked returned',
        );
      }

      if (!order.razorpayPaymentId) {
        throw new HttpErrors.BadRequest('No payment found for this order');
      }

      const deliveryChargeDeductionAmount = normalizeNumericValue(
        request.deliveryChargeDeductionAmount,
      );
      const deductDeliveryCharge =
        !!request.deductDeliveryCharge && deliveryChargeDeductionAmount > 0;
      const maxDeduction = normalizeNumericValue(order.shipping);
      const effectiveDeliveryChargeDeductionAmount = deductDeliveryCharge
        ? deliveryChargeDeductionAmount
        : 0;
      const refundableTotal =
        order.total - effectiveDeliveryChargeDeductionAmount;

      if (deliveryChargeDeductionAmount < 0) {
        throw new HttpErrors.BadRequest(
          'Delivery charge deduction amount cannot be negative',
        );
      }

      if (deductDeliveryCharge && maxDeduction <= 0) {
        throw new HttpErrors.BadRequest(
          'This order has no delivery charge available for deduction',
        );
      }

      if (deliveryChargeDeductionAmount > maxDeduction) {
        throw new HttpErrors.BadRequest(
          `Delivery charge deduction cannot exceed ${maxDeduction}`,
        );
      }

      if (request.amount <= 0 || request.amount > refundableTotal) {
        throw new HttpErrors.BadRequest(
          `Invalid refund amount. Must be between 0 and ${refundableTotal}`,
        );
      }

      const alreadyRefunded = order.refundAmount || 0;
      if (alreadyRefunded + request.amount > refundableTotal) {
        throw new HttpErrors.BadRequest(
          `Total refund amount (${alreadyRefunded + request.amount}) exceeds refundable amount (${refundableTotal})`,
        );
      }

      // In live mode, a failed Razorpay refund call must NEVER be papered
      // over with a fabricated refund — that would mark a customer's order
      // "refunded" when no money actually moved. The mock-refund fallback
      // below exists only for local/test-mode development against Razorpay
      // test-mode orders that may not exist server-side; it's gated on the
      // configured key being genuinely live (`rzp_live_...`), not a separate
      // flag that could drift out of sync with the real credentials in use.
      const liveMode = isLiveRazorpayMode(process.env.RAZORPAY_KEY_ID);
      let refund: any = null;

      try {
        refund = await this.razorpayService.createRefund(
          order.razorpayPaymentId,
          Math.round(request.amount * 100),
          {
            reason: request.reason,
            orderId: order.id,
            deductDeliveryCharge: String(deductDeliveryCharge),
            deliveryChargeDeductionAmount:
              effectiveDeliveryChargeDeductionAmount.toFixed(2),
          },
        );
        console.log('[Admin] Razorpay refund created:', refund.id);
      } catch (razorpayError: any) {
        if (liveMode) {
          console.error(
            '[Admin] Razorpay refund FAILED in LIVE mode — order will NOT be marked refunded:',
            {orderId: order.id, message: razorpayError.message},
          );
          throw new HttpErrors.BadGateway(
            'Razorpay could not process this refund. The order has not been marked as refunded. Please retry, or investigate the payment in the Razorpay dashboard before trying again.',
          );
        }

        console.warn(
          '[Admin] Razorpay refund failed in test mode — using mock refund for local/dev testing only:',
          razorpayError.message,
        );
        // Test-mode-only fallback: lets refund workflows be exercised
        // locally against orders that don't have a real Razorpay payment
        // behind them. Unreachable when RAZORPAY_KEY_ID is a live key.
        const mockRefundId = `refund_mock_${Date.now()}`;
        refund = {
          id: mockRefundId,
          amount: Math.round(request.amount * 100),
          currency: 'INR',
          payment_id: order.razorpayPaymentId,
          status: 'processed',
          created_at: Math.floor(Date.now() / 1000),
        };
        console.log('[Admin] Using mock refund for test order:', mockRefundId);
      }

      const refundId = refund.id;

      const totalRefunded = alreadyRefunded + request.amount;
      const isFullRefund = totalRefunded >= refundableTotal;
      const paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      await this.orderRepository.updateById(order.id, {
        refundAmount: totalRefunded,
        refundInitiatedAt: order.refundInitiatedAt || new Date(),
        refundCompletedAt: isFullRefund ? new Date() : order.refundCompletedAt,
        refundTransactionId: refundId,
        refundMethod: 'original_payment',
        deliveryChargeDeducted: deductDeliveryCharge,
        deliveryChargeDeductionAmount: effectiveDeliveryChargeDeductionAmount,
        paymentStatus,
        status: isFullRefund ? 'refunded' : order.status,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'refund_initiated',
        currentUser.id,
        `Refund of ₹${request.amount} initiated by admin. Reason: ${request.reason}`,
      );

      try {
        const emailHtml = await this.emailTemplateService.renderTemplate(
          'refund-initiated',
          {
            customerName: order.billingAddress.fullName,
            orderNumber: order.orderNumber,
            refundAmount: request.amount.toFixed(2),
            refundReason: request.reason,
            refundDate: new Date().toLocaleDateString(),
            refundTransactionId: refundId,
            processingDays: '5-7',
            originalAmount: formatCurrencyValue(order.total),
            deliveryChargeDeductionAmount: deductDeliveryCharge
              ? effectiveDeliveryChargeDeductionAmount.toFixed(2)
              : null,
            year: new Date().getFullYear(),
            companyName: 'Valiarian',
          },
        );

        await this.emailService.sendMail({
          to: order.billingAddress.email,
          subject: `Refund Initiated - ${order.orderNumber}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Error sending refund email:', emailError);
      }

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, order: updatedOrder, refund};
    } catch (error) {
      console.error('Error initiating refund:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to initiate refund: ${error.message}`,
      );
    }
  }

  @post('/api/admin/orders/{orderId}/notes')
  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  async adminAddOrderNotes(
    @param.path.string('orderId') orderId: string,
    @requestBody() request: {note: string},
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      const timestamp = new Date().toISOString();
      const noteEntry = `[${timestamp}] [Admin: ${currentUser.email || currentUser.id}] ${request.note}`;

      const existingNotes = order.notes || '';
      const updatedNotes = existingNotes
        ? `${existingNotes}\n${noteEntry}`
        : noteEntry;

      await this.orderRepository.updateById(order.id, {
        notes: updatedNotes,
        updatedAt: new Date(),
      });

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, order: updatedOrder};
    } catch (error) {
      console.error('Error adding order notes:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Failed to add notes: ${error.message}`,
      );
    }
  }

  @post('/api/webhooks/razorpay')
  async handleRazorpayWebhook(
    @requestBody({
      content: {
        'application/json': {
          schema: {type: 'object'},
        },
      },
    })
    body: any,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<{success: boolean}> {
    try {
      const signature = request.headers['x-razorpay-signature'] as string;

      if (!signature) {
        throw new HttpErrors.BadRequest('Missing webhook signature');
      }

      // Must be the exact bytes Razorpay signed — re-serializing the parsed
      // `body` via JSON.stringify is not guaranteed to match the original
      // payload (key order, number formatting, whitespace) and would make
      // signature verification unreliable. See index.ts's requestBodyParser
      // `verify` hook, which captures this for every request.
      const rawBody = resolveWebhookRawBody(request as unknown as {rawBody?: Buffer});
      if (!rawBody) {
        console.error(
          '[RazorpayWebhook] Raw request body unavailable — rejecting webhook rather than falling back to a re-serialized approximation.',
        );
        throw new HttpErrors.BadRequest('Unable to verify webhook payload');
      }

      const isValid = this.razorpayService.verifyWebhookSignature(
        rawBody,
        signature,
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        throw new HttpErrors.Unauthorized('Invalid webhook signature');
      }

      const event = body.event;
      const payload = body.payload;

      console.log(`Received Razorpay webhook: ${event}`);

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;

        case 'refund.created':
          await this.handleRefundCreated(payload);
          break;

        case 'refund.processed':
          await this.handleRefundProcessed(payload);
          break;

        case 'refund.failed':
          await this.handleRefundFailed(payload);
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      return {success: true};
    } catch (error) {
      console.error('Error handling webhook:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      return {success: false};
    }
  }

  private async handlePaymentCaptured(payload: any): Promise<void> {
    let transaction: any;
    let transactionCompleted = false;
    try {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      transaction = await this.dataSource.beginTransaction(
        IsolationLevel.READ_COMMITTED,
      );

      const orders = await this.orderRepository.find(
        {
          where: {razorpayOrderId, isDeleted: false},
          limit: 1,
        },
        {transaction},
      );
      const order = orders[0];

      if (!order) {
        console.error(
          `Order not found for Razorpay order ID: ${razorpayOrderId}`,
        );
        await transaction.rollback();
        return;
      }

      if (order.status === 'pending') {
        console.log(
          '[Order Email] Payment captured webhook confirmed pending order, sending emails',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            previousStatus: order.status,
            paymentId: payment.id,
          },
        );
        const paymentRecord = await this.paymentRepository.findOne(
          {where: {orderId: order.id}},
          {transaction},
        );

        if (paymentRecord) {
          await this.paymentRepository.updateById(
            paymentRecord.id,
            {
              status: 'success',
              razorpayOrderId,
              razorpayPaymentId: payment.id,
            },
            {transaction},
          );
        }

        await this.decrementOrderStock(
          await this.loadOrderItems(order.id, {transaction}),
          {transaction},
        );

        await this.orderRepository.updateById(
          order.id,
          {
            status: 'confirmed',
            paymentStatus: 'paid',
            razorpayPaymentId: payment.id,
            updatedAt: new Date(),
          },
          {transaction},
        );

        await this.orderStatusHistoryRepository.createStatusEntry(
          order.id,
          'confirmed',
          order.userId,
          'Payment captured via webhook',
          {transaction},
        );

        await transaction.commit();
        transactionCompleted = true;

        const updatedOrder = await this.orderRepository.findById(order.id);

        try {
          const emailHtml = await this.emailTemplateService.renderTemplate(
            'order-confirmation',
            {
              customerName: updatedOrder.billingAddress.fullName,
              orderNumber: updatedOrder.orderNumber,
              items: (await this.loadOrderItems(updatedOrder.id)).map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: formatCurrencyValue(item.price),
              })),
              subtotal: formatCurrencyValue(updatedOrder.subtotal),
              discount:
                normalizeNumericValue(updatedOrder.discount) > 0
                  ? formatCurrencyValue(updatedOrder.discount)
                  : null,
              shipping: formatCurrencyValue(updatedOrder.shipping),
              tax: formatCurrencyValue(updatedOrder.tax),
              total: formatCurrencyValue(updatedOrder.total),
              shippingAddress: updatedOrder.shippingAddress,
              billingAddress: updatedOrder.billingAddress,
              trackOrderUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${updatedOrder.id}/tracking`,
              year: new Date().getFullYear(),
              companyName: 'Valiarian',
            },
          );

          await this.emailService.sendMail({
            from: this.getOrderMailSender(),
            to: updatedOrder.billingAddress.email,
            subject: `Payment Confirmed - ${updatedOrder.orderNumber}`,
            html: emailHtml,
          });
        } catch (emailError) {
          console.error(
            'Error sending payment confirmation email:',
            emailError,
          );
        }

        await this.sendAdminOrderNotificationEmail(updatedOrder);
        return;
      }

      await transaction.commit();
      transactionCompleted = true;
    } catch (error) {
      if (transaction && !transactionCompleted) {
        await transaction.rollback();
      }
      console.error('Error handling payment.captured:', error);
    }
  }

  private async handlePaymentFailed(payload: any): Promise<void> {
    try {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const order =
        await this.orderRepository.findByRazorpayOrderId(razorpayOrderId);

      if (!order) {
        console.error(
          `Order not found for Razorpay order ID: ${razorpayOrderId}`,
        );
        return;
      }

      // Razorpay may redeliver this webhook; without a guard every
      // redelivery would insert a duplicate history row and re-email the
      // customer a "payment failed" notice. Dedupe on (event, payment ID).
      const marker = buildRazorpayEventMarker('payment.failed', payment.id);
      const existingHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId: order.id},
      });
      if (historyAlreadyContainsMarker(existingHistory, marker)) {
        console.log(
          `[RazorpayWebhook] Duplicate payment.failed delivery ignored for payment ${payment.id}`,
        );
        return;
      }

      await this.orderRepository.updateById(order.id, {
        paymentStatus: 'failed',
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'failed',
        order.userId,
        `Payment failed: ${payment.error_description || 'Unknown error'} ${marker}`,
      );

      try {
        await this.emailService.sendMail({
          to: order.billingAddress.email,
          subject: `Payment Failed - ${order.orderNumber}`,
          html: `
            <h2>Payment Failed</h2>
            <p>Dear ${order.billingAddress.fullName},</p>
            <p>Unfortunately, your payment could not be processed.</p>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Reason:</strong> ${payment.error_description || 'Unknown error'}</p>
            <p>Please try again or contact support if the issue persists.</p>
          `,
        });
      } catch (emailError) {
        console.error('Error sending payment failed email:', emailError);
      }
    } catch (error) {
      console.error('Error handling payment.failed:', error);
    }
  }

  private async handleRefundCreated(payload: any): Promise<void> {
    try {
      const refund = payload.refund.entity;
      const paymentId = refund.payment_id;

      const orders = await this.orderRepository.find({
        where: {razorpayPaymentId: paymentId},
        limit: 1,
      });

      if (orders.length === 0) {
        console.error(`Order not found for payment ID: ${paymentId}`);
        return;
      }

      const order = orders[0];

      const marker = buildRazorpayEventMarker('refund.created', refund.id);
      const existingHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId: order.id},
      });
      if (historyAlreadyContainsMarker(existingHistory, marker)) {
        console.log(
          `[RazorpayWebhook] Duplicate refund.created delivery ignored for refund ${refund.id}`,
        );
        return;
      }

      await this.orderRepository.updateById(order.id, {
        refundAmount: refund.amount / 100,
        refundInitiatedAt: new Date(),
        refundTransactionId: refund.id,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'refund_initiated',
        order.userId,
        `Refund initiated: ₹${refund.amount / 100} ${marker}`,
      );
    } catch (error) {
      console.error('Error handling refund.created:', error);
    }
  }

  private async handleRefundProcessed(payload: any): Promise<void> {
    try {
      const refund = payload.refund.entity;
      const paymentId = refund.payment_id;

      const orders = await this.orderRepository.find({
        where: {razorpayPaymentId: paymentId},
        limit: 1,
      });

      if (orders.length === 0) {
        console.error(`Order not found for payment ID: ${paymentId}`);
        return;
      }

      const order = orders[0];

      const marker = buildRazorpayEventMarker('refund.processed', refund.id);
      const existingHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId: order.id},
      });
      if (historyAlreadyContainsMarker(existingHistory, marker)) {
        console.log(
          `[RazorpayWebhook] Duplicate refund.processed delivery ignored for refund ${refund.id}`,
        );
        return;
      }

      const isFullRefund = refund.amount >= order.total * 100;
      const paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      await this.orderRepository.updateById(order.id, {
        paymentStatus,
        refundCompletedAt: new Date(),
        status: isFullRefund ? 'refunded' : order.status,
        refundMethod: 'original_payment',
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'refund_completed',
        order.userId,
        `Refund processed: ₹${refund.amount / 100} ${marker}`,
      );

      try {
        const emailHtml = await this.emailTemplateService.renderTemplate(
          'refund-completed',
          {
            customerName: order.billingAddress.fullName,
            orderNumber: order.orderNumber,
            refundAmount: (refund.amount / 100).toFixed(2),
            refundDate: new Date().toLocaleDateString(),
            transactionId: refund.id,
            refundInitiatedDate:
              order.refundInitiatedAt?.toLocaleDateString() || 'N/A',
            refundCompletedDate: new Date().toLocaleDateString(),
            orderDate: order.createdAt
              ? order.createdAt.toLocaleDateString()
              : 'N/A',
            originalAmount: formatCurrencyValue(order.total),
            refundMethod: 'Original payment method',
            orderDetailsUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order.id}`,
            feedbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/feedback`,
            year: new Date().getFullYear(),
            companyName: 'Valiarian',
          },
        );

        await this.emailService.sendMail({
          to: order.billingAddress.email,
          subject: `Refund Processed - ${order.orderNumber}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Error sending refund confirmation email:', emailError);
      }
    } catch (error) {
      console.error('Error handling refund.processed:', error);
    }
  }

  private async handleRefundFailed(payload: any): Promise<void> {
    try {
      const refund = payload.refund.entity;
      const paymentId = refund.payment_id;

      const orders = await this.orderRepository.find({
        where: {razorpayPaymentId: paymentId},
        limit: 1,
      });

      if (orders.length === 0) {
        console.error(`Order not found for payment ID: ${paymentId}`);
        return;
      }

      const order = orders[0];

      const marker = buildRazorpayEventMarker('refund.failed', refund.id);
      const existingHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId: order.id},
      });
      if (historyAlreadyContainsMarker(existingHistory, marker)) {
        console.log(
          `[RazorpayWebhook] Duplicate refund.failed delivery ignored for refund ${refund.id}`,
        );
        return;
      }

      // Deliberately does NOT touch status/paymentStatus here: if this order
      // was already optimistically marked refunded by the admin-initiated
      // refund flow, we have no reliable prior value to roll back to.
      // Surfacing the failure for manual reconciliation is safer than
      // guessing a revert that could itself be wrong.
      const failureReason =
        refund.error_description ||
        refund.status_reason_code ||
        'Refund failed at Razorpay (no reason provided)';

      await this.orderRepository.updateById(order.id, {
        refundFailureReason: failureReason,
        refundFailedAt: new Date(),
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'refund_failed',
        order.userId,
        `Refund failed: ${failureReason} ${marker}`,
      );

      console.error(
        '[RazorpayWebhook] Refund failed — needs manual reconciliation',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          refundId: refund.id,
          paymentId,
          reason: failureReason,
        },
      );
    } catch (error) {
      console.error('Error handling refund.failed:', error);
    }
  }
}
