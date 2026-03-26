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
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {ValiarianDataSource} from '../datasources';
import {Invoice, Order, OrderItemEntity, Payment} from '../models';
import {
  InvoiceRepository,
  OrderItemRepository,
  OrderRepository,
  OrderStatusHistoryRepository,
  PaymentRepository,
  ProductRepository,
  ProductVariantRepository,
} from '../repositories';
import {EmailTemplateService} from '../services/email-template.service';
import {EmailService} from '../services/email.service';
import {InvoiceGeneratorService} from '../services/invoice-generator.service';
import {RazorpayService} from '../services/razorpay.service';
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

interface CreateOrderRequest {
  cartItems: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
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

export class OrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(OrderStatusHistoryRepository)
    public orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @repository(OrderItemRepository)
    public orderItemRepository: OrderItemRepository,
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
  ) {}

  private async buildOrderDraft(request: CreateOrderRequest) {
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
      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new HttpErrors.NotFound(`Product ${item.productId} not found`);
      }

      if (product.status !== 'published') {
        throw new HttpErrors.BadRequest(
          `Product ${product.name} is not available`,
        );
      }

      let availableStock = product.stockQuantity;
      let itemPrice = product.salePrice || product.price;
      let variantDetails = null;

      if (item.variantId) {
        let variant = await this.productVariantRepository
          .findById(item.variantId)
          .catch(() => null);

        if (!variant && Array.isArray(product.variants)) {
          variant = product.variants.find(v => v.id === item.variantId) || null;
        }

        console.log('Product:', product);
        console.log('Variant:', variant);
        if (!variant) {
          throw new HttpErrors.NotFound(
            `Variant ${item.variantId} not found for product ${product.name}`,
          );
        }

        availableStock = variant.stockQuantity;
        itemPrice = product.salePrice || variant.price || product.price;

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
        name: product.name,
        image: product.coverImage || '',
        sku: product.sku || '',
        ...variantDetails,
        quantity: item.quantity,
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
      });
    }

    const discount = request.discount || 0;
    const shipping = request.shipping || 0;
    tax = Number(roundCurrency(tax));
    const total = subtotal - discount + shipping;

    if (subtotal <= 0 || total <= 0) {
      throw new HttpErrors.BadRequest('Invalid order total');
    }

    return {
      orderItems,
      subtotal,
      discount,
      shipping,
      tax,
      total: subtotal - discount + shipping,
    };
  }

  private async decrementOrderStock(orderItems: Array<any>) {
    for (const item of orderItems) {
      const product = await this.productRepository.findById(item.productId);

      if (item.variantId) {
        const variant = await this.productVariantRepository
          .findById(item.variantId)
          .catch(() => null);

        if (variant) {
          await this.productRepository.updateVariantStock(
            item.productId,
            item.variantId,
            variant.stockQuantity - item.quantity,
          );
          continue;
        }

        if (Array.isArray(product.variants) && product.variants.length > 0) {
          const updatedVariants = product.variants.map(productVariant => {
            if (productVariant.id !== item.variantId) {
              return productVariant;
            }

            const nextStock = Math.max(
              0,
              (productVariant.stockQuantity || 0) - item.quantity,
            );

            return {
              ...productVariant,
              stockQuantity: nextStock,
              inStock: nextStock > 0,
            };
          });

          const totalStock = updatedVariants.reduce(
            (sum, productVariant) => sum + (productVariant.stockQuantity || 0),
            0,
          );

          await this.productRepository.updateById(item.productId, {
            variants: updatedVariants,
            stockQuantity: totalStock,
            inStock: totalStock > 0,
            updatedAt: new Date(),
          });
          continue;
        }

        throw new HttpErrors.NotFound(
          `Variant ${item.variantId} not found for product ${product.name}`,
        );
      } else {
        await this.productRepository.updateStock(
          item.productId,
          product.stockQuantity - item.quantity,
        );
      }
    }
  }

  private async incrementOrderStock(orderItems: Array<any>) {
    for (const item of orderItems) {
      const product = await this.productRepository
        .findById(item.productId)
        .catch(() => null);

      if (!product) {
        console.warn(
          `Skipping stock restore. Product ${item.productId} not found for cancelled order item.`,
        );
        continue;
      }

      if (item.variantId) {
        const variant = await this.productVariantRepository
          .findById(item.variantId)
          .catch(() => null);

        if (variant) {
          await this.productRepository.updateVariantStock(
            item.productId,
            item.variantId,
            (variant.stockQuantity || 0) + item.quantity,
          );
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

            await this.productRepository.updateById(item.productId, {
              variants: updatedVariants,
              stockQuantity: totalStock,
              inStock: totalStock > 0,
              updatedAt: new Date(),
            });
            continue;
          }
        }

        console.warn(
          `Variant ${item.variantId} not found for product ${product.id}. Restoring cancelled quantity to base product stock.`,
        );
      }

      await this.productRepository.updateStock(
        item.productId,
        (product.stockQuantity || 0) + item.quantity,
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
      const emailHtml = await this.emailTemplateService.renderTemplate(
        'order-confirmation',
        {
          customerName: order.billingAddress.fullName,
          orderNumber: order.orderNumber,
          items: order.items.map(item => ({
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
      confirmed:
        ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'returned', 'refunded'].includes(
          status,
        )
          ? order.createdAt?.toLocaleDateString() || updatedDate
          : null,
      processing: ['processing', 'packed', 'shipped', 'delivered', 'returned', 'refunded'].includes(
        status,
      )
        ? updatedDate
        : null,
      packed: ['packed', 'shipped', 'delivered', 'returned', 'refunded'].includes(
        status,
      )
        ? updatedDate
        : null,
      shipped: ['shipped', 'delivered', 'returned', 'refunded'].includes(status)
        ? updatedDate
        : null,
      delivered: ['delivered', 'returned', 'refunded'].includes(status)
        ? order.deliveredAt?.toLocaleDateString() || updatedDate
        : null,
    };
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
    const items = order.items.map(item => ({
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
          trackingNumber: order.trackingNumber || request.trackingNumber || 'Will be shared soon',
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
          deliveredDate: order.deliveredAt?.toLocaleDateString() || new Date().toLocaleDateString(),
          deliveredTo: order.shippingAddress?.fullName || customerName,
          trackingNumber: order.trackingNumber,
          items,
          reviewUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order.id}/review`,
          returnWindowDays: process.env.RETURN_WINDOW_DAYS || '7',
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
            order.createdAt?.toLocaleDateString() || new Date().toLocaleDateString(),
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
          items: order.items.map(item => ({
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
      orderId,
      productId: item.productId,
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
      sku: item.sku,
      image: item.image,
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

    const invoicePayload =
      this.invoiceGeneratorService.buildInvoiceRecord(order);

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
    return this.orderRepository.findById(
      orderId,
      {
        include: [
          {relation: 'orderItems'},
          {relation: 'payment'},
          {relation: 'invoice'},
          {relation: 'user'},
        ],
      },
      options,
    );
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

    try {
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
        throw new HttpErrors.NotFound(
          'Payment record not found for this order',
        );
      }

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

      const isValid = this.razorpayService.verifyPaymentSignature(
        normalizedRequest.razorpayOrderId,
        normalizedRequest.razorpayPaymentId,
        normalizedRequest.razorpaySignature,
      );

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
      );

      await transaction.commit();
      transactionCompleted = true;

      const updatedOrder = await this.orderRepository.findById(order.id);

      await this.decrementOrderStock(order.items);

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

      const {subtotal, discount, shipping, tax, total} =
        await this.buildOrderDraft(request);
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
    try {
      const userId = currentUser.id;
      const {orderItems, subtotal, discount, shipping, tax, total} =
        await this.buildOrderDraft(request);

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

      const order = await this.orderRepository.create({
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
        shipping,
        tax,
        total,
        totalAmount: total,
        currency: 'INR',
        billingAddress: request.billingAddress,
        shippingAddress: request.shippingAddress,
        items: orderItems,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.orderItemRepository.createAll(
        this.buildOrderItemEntities(order.id, orderItems),
      );

      let paymentRecord: Payment | null = null;

      if (request.paymentMethod === 'razorpay') {
        paymentRecord = await this.paymentRepository.create({
          orderId: order.id,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          amount: total,
          status: request.paymentDetails ? 'success' : 'created',
          method: 'razorpay',
        });
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
      );

      let invoice: Invoice | ReturnType<typeof buildInvoiceFromOrder> =
        buildInvoiceFromOrder(order);

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
        await this.decrementOrderStock(order.items);
        if (request.paymentMethod === 'razorpay') {
          invoice = await this.createInvoiceRecord(order);
        }
        await this.sendOrderConfirmationEmail(order, currentUser);
        await this.sendAdminOrderNotificationEmail(order);
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

      return {
        success: true,
        orders,
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
      });

      return {
        success: true,
        order,
        statusHistory,
        invoice: buildInvoiceFromOrder(order),
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
        invoice: buildInvoiceFromOrder(order),
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
      });

      const events = statusHistory.map(history => ({
        status: history.status,
        comment: history.comment,
        timestamp: history.createdAt,
      }));

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

      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new HttpErrors.BadRequest(
          `Cannot cancel order with status '${order.status}'. Only pending or confirmed orders can be cancelled.`,
        );
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

      await this.incrementOrderStock(order.items);

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
            items: order.items.map(item => ({
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
    @requestBody() request: {reason: string; images?: string[]},
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

      if (!order.deliveredAt) {
        throw new HttpErrors.BadRequest('Order delivery date not found');
      }

      const returnWindowDays = parseInt(
        process.env.RETURN_WINDOW_DAYS || '7',
        10,
      );
      const returnWindowMs = returnWindowDays * 24 * 60 * 60 * 1000;
      const deliveryTime = new Date(order.deliveredAt).getTime();
      const currentTime = new Date().getTime();

      if (currentTime - deliveryTime > returnWindowMs) {
        throw new HttpErrors.BadRequest(
          `Return window of ${returnWindowDays} days has expired. Order was delivered on ${new Date(
            order.deliveredAt,
          ).toLocaleDateString()}.`,
        );
      }

      await this.orderRepository.updateById(order.id, {
        returnStatus: 'requested',
        returnInitiatedAt: new Date(),
        returnReason: request.reason,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'return_requested',
        currentUser.id,
        `Return requested. Reason: ${request.reason}`,
      );

      try {
        const emailHtml = await this.emailTemplateService.renderTemplate(
          'return-request-received',
          {
            customerName: order.billingAddress.fullName,
            orderNumber: order.orderNumber,
            returnReason: request.reason,
            orderDate: order.createdAt
              ? order.createdAt.toLocaleDateString()
              : new Date().toLocaleDateString(),
            deliveryDate: order.deliveredAt?.toLocaleDateString(),
            items: order.items.map(item => ({
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

      const totalPages = Math.ceil(total.count / limit);

      return {
        success: true,
        orders,
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
        include: [{relation: 'user'}],
      });

      if (!order) {
        console.error(`[Admin] Order not found: ${orderId}`);
        throw new HttpErrors.NotFound('Order not found');
      }

      console.log(`[Admin] Order found: ${order.orderNumber}`);

      const statusHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId},
        order: ['createdAt DESC'],
      });

      console.log(`[Admin] Status history entries: ${statusHistory.length}`);

      return {success: true, order, statusHistory};
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
        'delivered',
        'cancelled',
        'returned',
        'refunded',
      ];

      if (!validStatuses.includes(request.status)) {
        console.error(`[Admin] Invalid status: ${request.status}`);
        throw new HttpErrors.BadRequest(`Invalid status: ${request.status}`);
      }

      const statusTransitions: any = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['packed', 'cancelled'],
        packed: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: ['returned'],
        cancelled: [],
        returned: ['refunded'],
        refunded: [],
      };

      if (
        order.status !== request.status &&
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

      console.log(`[Admin] Updating order with data:`, updateData);

      await this.orderRepository.updateById(order.id, updateData);
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
      console.log(`[Admin] Updated order fetched successfully`);

      if (order.status !== request.status) {
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

      await this.orderRepository.updateById(order.id, {
        returnStatus: newReturnStatus,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        `return_${request.action}d`,
        currentUser.id,
        request.comment || `Return ${request.action}d by admin`,
      );

      try {
        if (request.action === 'approve') {
          const emailHtml = await this.emailTemplateService.renderTemplate(
            'return-approved',
            {
              customerName: order.billingAddress.fullName,
              orderNumber: order.orderNumber,
              approvalDate: new Date().toLocaleDateString(),
              returnReason: order.returnReason || 'Not specified',
              adminComment: request.comment || '',
              items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
              })),
              nextSteps:
                'Our team will contact you shortly to schedule a pickup.',
              year: new Date().getFullYear(),
              companyName: 'Valiarian',
            },
          );

          await this.emailService.sendMail({
            to: order.billingAddress.email,
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
              items: order.items.map(item => ({
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
    @requestBody() request: {amount: number; reason: string},
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order; refund: any}> {
    try {
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (!['cancelled', 'returned'].includes(order.status)) {
        throw new HttpErrors.BadRequest(
          'Refund can only be initiated for cancelled or returned orders',
        );
      }

      if (!order.razorpayPaymentId) {
        throw new HttpErrors.BadRequest('No payment found for this order');
      }

      if (request.amount <= 0 || request.amount > order.total) {
        throw new HttpErrors.BadRequest(
          `Invalid refund amount. Must be between 0 and ${order.total}`,
        );
      }

      const alreadyRefunded = order.refundAmount || 0;
      if (alreadyRefunded + request.amount > order.total) {
        throw new HttpErrors.BadRequest(
          `Total refund amount (${alreadyRefunded + request.amount}) exceeds order total (${order.total})`,
        );
      }

      // Try to create Razorpay refund, but handle test orders gracefully
      let refund: any = null;
      let refundId = `refund_${Date.now()}`;

      try {
        refund = await this.razorpayService.createRefund(
          order.razorpayPaymentId,
          Math.round(request.amount * 100),
          {reason: request.reason, orderId: order.id},
        );
        refundId = refund.id;
        console.log('[Admin] Razorpay refund created:', refundId);
      } catch (razorpayError: any) {
        console.warn(
          '[Admin] Razorpay refund failed (possibly test order):',
          razorpayError.message,
        );
        // For test orders or when Razorpay fails, create a mock refund
        refund = {
          id: refundId,
          amount: Math.round(request.amount * 100),
          currency: 'INR',
          payment_id: order.razorpayPaymentId,
          status: 'processed',
          created_at: Math.floor(Date.now() / 1000),
        };
        console.log('[Admin] Using mock refund for test order:', refundId);
      }

      const totalRefunded = alreadyRefunded + request.amount;
      const isFullRefund = totalRefunded >= order.total;
      const paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      await this.orderRepository.updateById(order.id, {
        refundAmount: totalRefunded,
        refundInitiatedAt: order.refundInitiatedAt || new Date(),
        refundTransactionId: refundId,
        paymentStatus,
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

      const rawBody = JSON.stringify(body);
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
        await this.orderRepository.updateById(order.id, {
          status: 'confirmed',
          paymentStatus: 'paid',
          razorpayPaymentId: payment.id,
          updatedAt: new Date(),
        });

        await this.orderStatusHistoryRepository.createStatusEntry(
          order.id,
          'confirmed',
          order.userId,
          'Payment captured via webhook',
        );

        const updatedOrder = await this.orderRepository.findById(order.id);

        try {
          const emailHtml = await this.emailTemplateService.renderTemplate(
            'order-confirmation',
            {
              customerName: updatedOrder.billingAddress.fullName,
              orderNumber: updatedOrder.orderNumber,
              items: updatedOrder.items.map(item => ({
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
      }
    } catch (error) {
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

      await this.orderRepository.updateById(order.id, {
        paymentStatus: 'failed',
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'failed',
        order.userId,
        `Payment failed: ${payment.error_description || 'Unknown error'}`,
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
        `Refund initiated: ₹${refund.amount / 100}`,
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

      const isFullRefund = refund.amount >= order.total * 100;
      const paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      await this.orderRepository.updateById(order.id, {
        paymentStatus,
        refundCompletedAt: new Date(),
        status: isFullRefund ? 'refunded' : order.status,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'refund_completed',
        order.userId,
        `Refund processed: ₹${refund.amount / 100}`,
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
}
