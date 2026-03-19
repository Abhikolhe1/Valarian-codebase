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
  subTotal: 0,
  total: 0,
  discount: 0,
  shipping: 0,
  billing: null,
  totalItems: 0,
};

const applyCartState = (state, cart) => {
  const { cart: normalizedCart, subTotal, total, totalItems } = calculateCheckoutTotals(
    cart,
    state.discount,
    state.shipping
  );

  state.cart = normalizedCart;
  state.discount = state.discount || 0;
  state.shipping = state.shipping || 0;
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
      applyCartState(state, action.payload);
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

      applyCartState(state, updatedCart);
    },

    deleteCart(state, action) {
      const updatedCart = state.cart.filter((product) => !isCartItemMatch(product, action.payload));
      applyCartState(state, updatedCart);
    },

    resetCart(state) {
      state.cart = [];
      state.billing = null;
      state.activeStep = 0;
      state.total = 0;
      state.subTotal = 0;
      state.discount = 0;
      state.shipping = 0;
      state.totalItems = 0;
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
    },

    decreaseQuantity(state, action) {
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
    },

    createBilling(state, action) {
      state.billing = action.payload;
    },

    applyDiscount(state, action) {
      const discount = action.payload;

      state.discount = discount;
      state.total = state.subTotal - discount;
    },

    applyShipping(state, action) {
      const shipping = action.payload;

      state.shipping = shipping;
      state.total = state.subTotal - state.discount + shipping;
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
  applyShipping,
  applyDiscount,
  increaseQuantity,
  decreaseQuantity,
} = slice.actions;
