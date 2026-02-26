import axios from './axios';

// ----------------------------------------------------------------------
// Order Creation Utilities
// Handles order creation with validation, stock checking, and error handling
// ----------------------------------------------------------------------

/**
 * Validate cart items stock availability
 * @param {Array} cartItems - Array of cart items
 * @returns {Promise<{valid: boolean, outOfStockItems: Array}>}
 */
export const validateCartStock = async (cartItems) => {
  try {
    const productIds = cartItems.map((item) => item.id);
    const response = await axios.post('/api/products/check-stock', { productIds });

    const stockData = response.data.stock || {};
    const outOfStockItems = [];

    cartItems.forEach((item) => {
      const stock = stockData[item.id];
      if (!stock || stock.available < item.quantity) {
        outOfStockItems.push({
          id: item.id,
          name: item.name,
          requested: item.quantity,
          available: stock?.available || 0,
        });
      }
    });

    return {
      valid: outOfStockItems.length === 0,
      outOfStockItems,
    };
  } catch (error) {
    console.error('Error validating cart stock:', error);
    // If stock check fails, allow order to proceed (backend will validate)
    return { valid: true, outOfStockItems: [] };
  }
};

/**
 * Calculate order totals
 * @param {Array} cartItems - Array of cart items
 * @param {number} discount - Discount amount
 * @param {number} shipping - Shipping cost
 * @param {number} taxRate - Tax rate (default: 0.1 for 10%)
 * @returns {object} - Calculated totals
 */
export const calculateOrderTotals = (cartItems, discount = 0, shipping = 0, taxRate = 0.1) => {
  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Calculate tax on subtotal after discount
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * taxRate;

  // Calculate total
  const total = subtotal - discount + shipping + tax;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

/**
 * Create order with timeout handling
 * @param {object} orderData - Order data
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<object>} - Created order
 */
export const createOrderWithTimeout = async (orderData, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await axios.post('/api/orders', orderData, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      throw new Error('ORDER_TIMEOUT');
    }

    throw error;
  }
};

/**
 * Create order
 * @param {object} params - Order creation parameters
 * @param {string} params.userId - User ID
 * @param {Array} params.cartItems - Cart items
 * @param {object} params.billingAddress - Billing address
 * @param {string} params.paymentMethod - Payment method
 * @param {object} params.paymentDetails - Payment details
 * @param {number} params.discount - Discount amount
 * @param {number} params.shipping - Shipping cost
 * @returns {Promise<object>} - Created order
 */
export const createOrder = async ({
  userId,
  cartItems,
  billingAddress,
  paymentMethod,
  paymentDetails,
  discount = 0,
  shipping = 0,
}) => {
  try {
    // Step 1: Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Step 2: Validate stock availability
    const stockValidation = await validateCartStock(cartItems);
    if (!stockValidation.valid) {
      const error = new Error('STOCK_UNAVAILABLE');
      error.outOfStockItems = stockValidation.outOfStockItems;
      throw error;
    }

    // Step 3: Calculate totals
    const totals = calculateOrderTotals(cartItems, discount, shipping);

    // Step 4: Prepare order data
    const orderData = {
      userId,
      items: cartItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        colors: item.colors || [],
        size: item.size || null,
      })),
      billingAddress,
      paymentMethod,
      paymentDetails,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      status: 'pending',
    };

    // Step 5: Create order with timeout
    const order = await createOrderWithTimeout(orderData);

    // Step 6: Clear cart from backend
    try {
      await axios.delete(`/api/cart/${userId}`);
    } catch (error) {
      console.error('Error clearing cart after order creation:', error);
      // Don't fail order creation if cart clearing fails
    }

    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Handle order creation errors
 * @param {Error} error - Error object
 * @returns {object} - Error details for UI
 */
export const handleOrderError = (error) => {
  if (error.message === 'ORDER_TIMEOUT') {
    return {
      type: 'timeout',
      title: 'Order Processing Timeout',
      message: 'Your order is taking longer than expected to process. Please check your order history in a few minutes to confirm if the order was created.',
      action: 'check_history',
    };
  }

  if (error.message === 'STOCK_UNAVAILABLE') {
    return {
      type: 'stock',
      title: 'Items Out of Stock',
      message: 'Some items in your cart are no longer available in the requested quantity.',
      outOfStockItems: error.outOfStockItems || [],
      action: 'update_cart',
    };
  }

  if (error.message === 'PAYMENT_FAILED') {
    return {
      type: 'payment',
      title: 'Payment Failed',
      message: error.details || 'Your payment could not be processed. Please try again or use a different payment method.',
      action: 'retry_payment',
    };
  }

  // Generic error
  return {
    type: 'generic',
    title: 'Order Creation Failed',
    message: error.message || 'An unexpected error occurred while creating your order. Please try again.',
    action: 'retry',
  };
};
