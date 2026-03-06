import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, patch, post, Request, requestBody, RestBindings} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {Order} from '../models';
import {
  OrderRepository,
  OrderStatusHistoryRepository,
  ProductRepository,
} from '../repositories';
import {EmailService} from '../services/email.service';
import {RazorpayService} from '../services/razorpay.service';

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
}

export class OrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(OrderStatusHistoryRepository)
    public orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject('services.razorpay')
    public razorpayService: RazorpayService,
    @inject('services.email')
    public emailService: EmailService,
  ) { }

  @post('/api/orders/create')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async createOrder(
    @requestBody() request: CreateOrderRequest,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order; razorpayOrderId?: string}> {
    try {
      const userId = currentUser.id;

      if (!request.cartItems || request.cartItems.length === 0) {
        throw new HttpErrors.BadRequest('Cart is empty');
      }

      const orderItems = [];
      let subtotal = 0;

      for (const item of request.cartItems) {
        const product = await this.productRepository.findById(item.productId);

        if (!product) {
          throw new HttpErrors.NotFound(`Product ${item.productId} not found`);
        }

        if (product.status !== 'published') {
          throw new HttpErrors.BadRequest(`Product ${product.name} is not available`);
        }

        let availableStock = 0;
        let itemPrice = product.price;
        let variantDetails = null;

        if (item.variantId && product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v.id === item.variantId);
          if (!variant) {
            throw new HttpErrors.NotFound(
              `Variant ${item.variantId} not found for product ${product.name}`,
            );
          }
          availableStock = variant.stockQuantity;
          if (variant.price) {
            itemPrice = variant.price;
          }
          variantDetails = {
            variantId: variant.id,
            color: variant.color,
            colorName: variant.colorName,
            size: variant.size,
          };
        } else {
          availableStock = product.stockQuantity;
        }

        if (availableStock < item.quantity) {
          throw new HttpErrors.BadRequest(
            `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`,
          );
        }

        const itemSubtotal = itemPrice * item.quantity;
        subtotal += itemSubtotal;

        orderItems.push({
          id: uuidv4(),
          productId: product.id,
          name: product.name,
          image: product.coverImage || '',
          sku: product.sku || '',
          ...variantDetails,
          quantity: item.quantity,
          price: itemPrice,
          subtotal: itemSubtotal,
        });
      }

      const discount = request.discount || 0;
      const shipping = request.shipping || 0;
      const tax = request.tax || 0;
      const total = subtotal - discount + shipping + tax;

      if (total <= 0) {
        throw new HttpErrors.BadRequest('Invalid order total');
      }

      const orderNumber = await this.orderRepository.generateOrderNumber(
        process.env.ORDER_PREFIX || 'ORD',
      );

      let razorpayOrderId: string | undefined;
      if (request.paymentMethod === 'razorpay') {
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
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: request.paymentMethod,
        razorpayOrderId,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        currency: 'INR',
        billingAddress: request.billingAddress,
        shippingAddress: request.shippingAddress,
        items: orderItems,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'pending',
        userId,
        'Order created',
      );

      return {success: true, order, razorpayOrderId};
    } catch (error) {
      console.error('Error creating order:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to create order: ${error.message}`);
    }
  }

  @post('/api/orders/verify-payment')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async verifyPayment(
    @requestBody()
    request: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; verified: boolean; order: Order}> {
    try {
      const userId = currentUser.id;
      const order = await this.orderRepository.findById(request.orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      if (order.userId !== userId) {
        throw new HttpErrors.Forbidden('Access denied');
      }

      if (order.status !== 'pending') {
        throw new HttpErrors.BadRequest(`Order is already ${order.status}. Cannot verify payment.`);
      }

      const isValid = this.razorpayService.verifyPaymentSignature(
        request.razorpayOrderId,
        request.razorpayPaymentId,
        request.razorpaySignature,
      );

      if (!isValid) {
        await this.orderRepository.updateById(order.id, {
          paymentStatus: 'failed',
          updatedAt: new Date(),
        });

        await this.orderStatusHistoryRepository.createStatusEntry(
          order.id,
          'failed',
          userId,
          'Payment verification failed',
        );

        throw new HttpErrors.BadRequest('Invalid payment signature');
      }

      await this.orderRepository.updateById(order.id, {
        status: 'confirmed',
        paymentStatus: 'paid',
        razorpayPaymentId: request.razorpayPaymentId,
        razorpaySignature: request.razorpaySignature,
        updatedAt: new Date(),
      });

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        'confirmed',
        userId,
        'Payment verified and order confirmed',
      );

      for (const item of order.items) {
        const product = await this.productRepository.findById(item.productId);

        if (item.variantId && product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v.id === item.variantId);
          if (variant) {
            await this.productRepository.updateVariantStock(
              item.productId,
              item.variantId,
              variant.stockQuantity - item.quantity,
            );
          }
        } else {
          await this.productRepository.updateStock(
            item.productId,
            product.stockQuantity - item.quantity,
          );
        }
      }

      try {
        await this.emailService.sendMail({
          to: order.billingAddress.email || currentUser.email,
          subject: `Order Confirmation - ${order.orderNumber}`,
          html: `
            <h2>Order Confirmed!</h2>
            <p>Dear ${order.billingAddress.fullName},</p>
            <p>Your order has been confirmed and is being processed.</p>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Total Amount:</strong> ₹${order.total}</p>
            <p>You can track your order status in your account.</p>
            <p>Thank you for shopping with us!</p>
          `,
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, verified: true, order: updatedOrder};
    } catch (error) {
      console.error('Error verifying payment:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to verify payment: ${error.message}`);
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
    pagination: {total: number; page: number; limit: number; totalPages: number};
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
      throw new HttpErrors.InternalServerError(`Failed to fetch orders: ${error.message}`);
    }
  }

  @get('/api/orders/{orderId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getOrderDetails(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: Order; statusHistory: any[]}> {
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

      return {success: true, order, statusHistory};
    } catch (error) {
      console.error('Error fetching order details:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to fetch order details: ${error.message}`);
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
      throw new HttpErrors.InternalServerError(`Failed to fetch tracking: ${error.message}`);
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

      for (const item of order.items) {
        const product = await this.productRepository.findById(item.productId);

        if (item.variantId && product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v.id === item.variantId);
          if (variant) {
            await this.productRepository.updateVariantStock(
              item.productId,
              item.variantId,
              variant.stockQuantity + item.quantity,
            );
          }
        } else {
          await this.productRepository.updateStock(
            item.productId,
            product.stockQuantity + item.quantity,
          );
        }
      }

      try {
        await this.emailService.sendMail({
          to: order.billingAddress.email || currentUser.email,
          subject: `Order Cancelled - ${order.orderNumber}`,
          html: `
            <h2>Order Cancelled</h2>
            <p>Dear ${order.billingAddress.fullName},</p>
            <p>Your order has been cancelled as requested.</p>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Cancellation Reason:</strong> ${request.reason}</p>
            ${order.paymentStatus === 'paid'
              ? `<p><strong>Refund:</strong> A refund of ₹${order.total} has been initiated and will be processed within 5-7 business days.</p>`
              : ''
            }
            <p>If you have any questions, please contact our support team.</p>
          `,
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
      throw new HttpErrors.InternalServerError(`Failed to cancel order: ${error.message}`);
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
        throw new HttpErrors.BadRequest('Only delivered orders can be returned');
      }

      if (!order.deliveredAt) {
        throw new HttpErrors.BadRequest('Order delivery date not found');
      }

      const returnWindowDays = parseInt(process.env.RETURN_WINDOW_DAYS || '7', 10);
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
        await this.emailService.sendMail({
          to: order.billingAddress.email || currentUser.email,
          subject: `Return Request Received - ${order.orderNumber}`,
          html: `
            <h2>Return Request Received</h2>
            <p>Dear ${order.billingAddress.fullName},</p>
            <p>We have received your return request for order ${order.orderNumber}.</p>
            <p><strong>Return Reason:</strong> ${request.reason}</p>
            <p>Our team will review your request and get back to you within 24-48 hours.</p>
            <p>Thank you for your patience.</p>
          `,
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
      throw new HttpErrors.InternalServerError(`Failed to process return: ${error.message}`);
    }
  }

  @get('/api/admin/orders')
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
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
    pagination: {total: number; page: number; limit: number; totalPages: number};
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
        where.or = [
          {orderNumber: {like: `%${search}%`, options: 'i'}},
        ];
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
      throw new HttpErrors.InternalServerError(`Failed to fetch orders: ${error.message}`);
    }
  }

  @get('/api/admin/orders/{orderId}')
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  async adminGetOrderDetails(
    @param.path.string('orderId') orderId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; order: any; statusHistory: any[]}> {
    try {
      const order = await this.orderRepository.findById(orderId, {
        include: [{relation: 'user'}],
      });

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

      const statusHistory = await this.orderStatusHistoryRepository.find({
        where: {orderId},
        order: ['createdAt DESC'],
      });

      return {success: true, order, statusHistory};
    } catch (error) {
      console.error('Error fetching admin order details:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to fetch order details: ${error.message}`);
    }
  }

  @patch('/api/admin/orders/{orderId}/status')
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
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
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        throw new HttpErrors.NotFound('Order not found');
      }

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
        throw new HttpErrors.BadRequest(
          `Cannot transition from '${order.status}' to '${request.status}'`,
        );
      }

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

      await this.orderRepository.updateById(order.id, updateData);

      await this.orderStatusHistoryRepository.createStatusEntry(
        order.id,
        request.status,
        currentUser.id,
        request.comment || `Status updated to ${request.status} by admin`,
      );

      try {
        const statusMessages: any = {
          confirmed: 'Your order has been confirmed and is being prepared.',
          processing: 'Your order is being processed.',
          packed: 'Your order has been packed and is ready for shipment.',
          shipped: 'Your order has been shipped.',
          delivered: 'Your order has been delivered.',
        };

        if (statusMessages[request.status]) {
          await this.emailService.sendMail({
            to: order.billingAddress.email,
            subject: `Order Status Update - ${order.orderNumber}`,
            html: `
              <h2>Order Status Updated</h2>
              <p>Dear ${order.billingAddress.fullName},</p>
              <p>${statusMessages[request.status]}</p>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Status:</strong> ${request.status}</p>
              ${request.trackingNumber ? `<p><strong>Tracking Number:</strong> ${request.trackingNumber}</p>` : ''}
              ${request.carrier ? `<p><strong>Carrier:</strong> ${request.carrier}</p>` : ''}
              <p>You can track your order in your account.</p>
            `,
          });
        }
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }

      const updatedOrder = await this.orderRepository.findById(order.id);

      return {success: true, order: updatedOrder};
    } catch (error) {
      console.error('Error updating order status:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(`Failed to update order status: ${error.message}`);
    }
  }

  @patch('/api/admin/orders/{orderId}/return')
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
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
        throw new HttpErrors.BadRequest('Action must be either "approve" or "reject"');
      }

      const newReturnStatus = request.action === 'approve' ? 'approved' : 'rejected';

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
          await this.emailService.sendMail({
            to: order.billingAddress.email,
            subject: `Return Approved - ${order.orderNumber}`,
            html: `
              <h2>Return Request Approved</h2>
              <p>Dear ${order.billingAddress.fullName},</p>
              <p>Your return request has been approved.</p>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              ${request.comment ? `<p><strong>Note:</strong> ${request.comment}</p>` : ''}
              <p>Our team will contact you shortly to schedule a pickup.</p>
            `,
          });
        } else {
          await this.emailService.sendMail({
            to: order.billingAddress.email,
            subject: `Return Request Rejected - ${order.orderNumber}`,
            html: `
              <h2>Return Request Rejected</h2>
              <p>Dear ${order.billingAddress.fullName},</p>
              <p>Unfortunately, your return request has been rejected.</p>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              ${request.comment ? `<p><strong>Reason:</strong> ${request.comment}</p>` : ''}
              <p>If you have any questions, please contact our support team.</p>
            `,
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
      throw new HttpErrors.InternalServerError(`Failed to process return: ${error.message}`);
    }
  }

  @post('/api/admin/orders/{orderId}/refund')
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
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

      const refund = await this.razorpayService.createRefund(
        order.razorpayPaymentId,
        Math.round(request.amount * 100),
        {reason: request.reason, orderId: order.id},
      );

      const totalRefunded = alreadyRefunded + request.amount;
      const isFullRefund = totalRefunded >= order.total;
      const paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      await this.orderRepository.updateById(order.id, {
        refundAmount: totalRefunded,
        refundInitiatedAt: order.refundInitiatedAt || new Date(),
        refundTransactionId: refund.id,
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
        await this.emailService.sendMail({
          to: order.billingAddress.email,
          subject: `Refund Initiated - ${order.orderNumber}`,
          html: `
            <h2>Refund Initiated</h2>
            <p>Dear ${order.billingAddress.fullName},</p>
            <p>A refund has been initiated for your order.</p>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Refund Amount:</strong> ₹${request.amount}</p>
            <p><strong>Reason:</strong> ${request.reason}</p>
            <p>The refund will be processed within 5-7 business days.</p>
          `,
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
      throw new HttpErrors.InternalServerError(`Failed to initiate refund: ${error.message}`);
    }
  }

  @post('/api/admin/orders/{orderId}/notes')
  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
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
      throw new HttpErrors.InternalServerError(`Failed to add notes: ${error.message}`);
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
      const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);

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

      const order = await this.orderRepository.findByRazorpayOrderId(razorpayOrderId);

      if (!order) {
        console.error(`Order not found for Razorpay order ID: ${razorpayOrderId}`);
        return;
      }

      if (order.status === 'pending') {
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

        try {
          await this.emailService.sendMail({
            to: order.billingAddress.email,
            subject: `Payment Confirmed - ${order.orderNumber}`,
            html: `
              <h2>Payment Confirmed!</h2>
              <p>Dear ${order.billingAddress.fullName},</p>
              <p>Your payment has been confirmed.</p>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Amount Paid:</strong> ₹${order.total}</p>
              <p>Your order is now being processed.</p>
            `,
          });
        } catch (emailError) {
          console.error('Error sending payment confirmation email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error handling payment.captured:', error);
    }
  }

  private async handlePaymentFailed(payload: any): Promise<void> {
    try {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const order = await this.orderRepository.findByRazorpayOrderId(razorpayOrderId);

      if (!order) {
        console.error(`Order not found for Razorpay order ID: ${razorpayOrderId}`);
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
        await this.emailService.sendMail({
          to: order.billingAddress.email,
          subject: `Refund Processed - ${order.orderNumber}`,
          html: `
            <h2>Refund Processed</h2>
            <p>Dear ${order.billingAddress.fullName},</p>
            <p>Your refund has been processed successfully.</p>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Refund Amount:</strong> ₹${refund.amount / 100}</p>
            <p>The amount will be credited to your account within 5-7 business days.</p>
          `,
        });
      } catch (emailError) {
        console.error('Error sending refund confirmation email:', emailError);
      }
    } catch (error) {
      console.error('Error handling refund.processed:', error);
    }
  }
}
