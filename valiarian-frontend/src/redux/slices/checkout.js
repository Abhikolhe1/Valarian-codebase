import { createSlice } from '@reduxjs/toolkit';
import uniq from 'lodash/uniq';
import {
  calculateCheckoutTotals,
  clampCartQuantity,
  getCartItemKey,
  isCartItemMatch,
  normalizeCartItem,
} from 'src/utils/cart-utils';

// ----------------------------------------------------------------------

const initialState = {
  activeStep: 0,
  cart: [],
  buyNowItem: null,
  actualSubTotal: 0,
  productDiscount: 0,
  subTotal: 0,
  total: 0,
  discount: 0,
  appliedCoupon: null,
  shipping: 0,
  tax: 0,
  billing: null,
  totalItems: 0,
  paymentSession: null,
};

const getCartSignature = (cart = []) =>
  cart
    .map((item) => `${getCartItemKey(item)}:${item.quantity}`)
    .sort()
    .join('|');

const resetCheckoutProgress = (state) => {
  state.activeStep = 0;
  state.billing = null;
};

const clearAppliedCoupon = (state) => {
  state.discount = 0;
  state.appliedCoupon = null;
};

const applyCartState = (state, cart) => {
  const {
    cart: normalizedCart,
    actualSubTotal,
    productDiscount,
    subTotal,
    taxAmount,
    total,
    totalItems,
  } = calculateCheckoutTotals(
    cart,
    state.discount,
    state.shipping
  );

  state.cart = normalizedCart;
  state.actualSubTotal = actualSubTotal || 0;
  state.productDiscount = productDiscount || 0;
  state.discount = state.discount || 0;
  state.shipping = state.shipping || 0;
  state.tax = taxAmount || 0;
  state.billing = state.billing || null;
  state.subTotal = subTotal;
  state.total = total;
  state.totalItems = totalItems;
};

const slice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    getCart(state, action) {
      const previousSignature = getCartSignature(state.cart);
      const nextCart = action.payload || [];
      applyCartState(state, nextCart);

      if (previousSignature !== getCartSignature(nextCart)) {
        clearAppliedCoupon(state);

        if (!state.buyNowItem && state.activeStep > 0) {
          resetCheckoutProgress(state);
        }
      }
    },

    addToCart(state, action) {
      const newProduct = normalizeCartItem(action.payload);

      if (!newProduct) {
        return;
      }

      const existingIndex = state.cart.findIndex(
        (product) => getCartItemKey(product) === getCartItemKey(newProduct)
      );

      const updatedCart = [...state.cart];

      if (existingIndex >= 0) {
        const existingProduct = updatedCart[existingIndex];
        updatedCart[existingIndex] = {
          ...existingProduct,
          available: newProduct.available || existingProduct.available,
          colors: uniq([...(existingProduct.colors || []), ...(newProduct.colors || [])]),
          quantity: clampCartQuantity(
            existingProduct.quantity + newProduct.quantity,
            newProduct.available || existingProduct.available
          ),
        };
      } else {
        updatedCart.push(newProduct);
      }

      const previousSignature = getCartSignature(state.cart);
      applyCartState(state, updatedCart);

      if (previousSignature !== getCartSignature(updatedCart)) {
        clearAppliedCoupon(state);

        if (!state.buyNowItem && state.activeStep > 0) {
          resetCheckoutProgress(state);
        }
      }
    },

    deleteCart(state, action) {
      if (state.buyNowItem && isCartItemMatch(state.buyNowItem, action.payload)) {
        state.buyNowItem = null;
        resetCheckoutProgress(state);
        return;
      }

      const previousSignature = getCartSignature(state.cart);
      const updatedCart = state.cart.filter((product) => !isCartItemMatch(product, action.payload));
      applyCartState(state, updatedCart);

      if (previousSignature !== getCartSignature(updatedCart)) {
        clearAppliedCoupon(state);

        if (!state.buyNowItem && state.activeStep > 0) {
          resetCheckoutProgress(state);
        }
      }
    },

    resetCart(state) {
      state.cart = [];
      state.buyNowItem = null;
      state.billing = null;
      state.activeStep = 0;
      state.total = 0;
      state.actualSubTotal = 0;
      state.productDiscount = 0;
      state.subTotal = 0;
      state.discount = 0;
      state.appliedCoupon = null;
      state.shipping = 0;
      state.actualSubTotal = 0;
      state.productDiscount = 0;
      state.tax = 0;
      state.totalItems = 0;
      state.paymentSession = null;
    },

    backStep(state) {
      state.activeStep = Math.max(0, state.activeStep - 1);
    },

    nextStep(state) {
      state.activeStep += 1;
    },

    gotoStep(state, action) {
      state.activeStep = action.payload;
    },

    increaseQuantity(state, action) {
      if (state.buyNowItem && isCartItemMatch(state.buyNowItem, action.payload)) {
        state.buyNowItem = {
          ...state.buyNowItem,
          quantity: clampCartQuantity(state.buyNowItem.quantity + 1, state.buyNowItem.available),
        };
        return;
      }

      const previousSignature = getCartSignature(state.cart);
      const updatedCart = state.cart.map((product) => {
        if (!isCartItemMatch(product, action.payload)) {
          return product;
        }

        return {
          ...product,
          quantity: clampCartQuantity(product.quantity + 1, product.available),
        };
      });

      applyCartState(state, updatedCart);

      if (previousSignature !== getCartSignature(updatedCart)) {
        clearAppliedCoupon(state);

        if (!state.buyNowItem && state.activeStep > 0) {
          resetCheckoutProgress(state);
        }
      }
    },

    decreaseQuantity(state, action) {
      if (state.buyNowItem && isCartItemMatch(state.buyNowItem, action.payload)) {
        state.buyNowItem = {
          ...state.buyNowItem,
          quantity: Math.max(1, state.buyNowItem.quantity - 1),
        };
        return;
      }

      const previousSignature = getCartSignature(state.cart);
      const updatedCart = state.cart
        .map((product) => {
          if (!isCartItemMatch(product, action.payload)) {
            return product;
          }

          return {
            ...product,
            quantity: Math.max(1, product.quantity - 1),
          };
        })
        .filter(Boolean);

      applyCartState(state, updatedCart);

      if (previousSignature !== getCartSignature(updatedCart)) {
        clearAppliedCoupon(state);

        if (!state.buyNowItem && state.activeStep > 0) {
          resetCheckoutProgress(state);
        }
      }
    },

    createBilling(state, action) {
      state.billing = action.payload;
    },

    resetCheckoutFlow(state) {
      state.buyNowItem = null;
      state.billing = null;
      state.activeStep = 0;
      state.discount = 0;
      state.appliedCoupon = null;
      state.shipping = 0;
      state.tax = 0;
      state.paymentSession = null;
    },

    setPaymentSession(state, action) {
      state.paymentSession = action.payload;
    },

    clearPaymentSession(state) {
      state.paymentSession = null;
    },

    startBuyNow(state, action) {
      const newProduct = normalizeCartItem(action.payload);

      if (!newProduct) {
        return;
      }

      state.buyNowItem = newProduct;
      state.billing = null;
      state.discount = 0;
      state.shipping = 0;
      state.activeStep = 1;
    },

    applyDiscount(state, action) {
      const discount = action.payload;

      state.discount = discount;
      state.appliedCoupon = null;
      state.total = state.subTotal - discount;
    },

    applyCoupon(state, action) {
      state.discount = Number(action.payload?.discount || 0);
      state.appliedCoupon = action.payload?.coupon || null;
      state.total = state.subTotal - state.discount;
    },

    removeCoupon(state) {
      clearAppliedCoupon(state);
      state.total = state.subTotal;
    },

    applyShipping(state, action) {
      const shipping = action.payload;

      state.shipping = shipping;
      state.total = state.subTotal - state.discount;
    },
  },
});

// Reducer
export default slice.reducer;

// Actions
export const {
  getCart,
  addToCart,
  resetCart,
  gotoStep,
  backStep,
  nextStep,
  deleteCart,
  createBilling,
  resetCheckoutFlow,
  setPaymentSession,
  clearPaymentSession,
  startBuyNow,
  applyShipping,
  applyDiscount,
  applyCoupon,
  removeCoupon,
  increaseQuantity,
  decreaseQuantity,
} = slice.actions;
