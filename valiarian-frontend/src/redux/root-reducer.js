import { combineReducers } from 'redux';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
// slices
import checkoutReducer from './slices/checkout';
import favoritesReducer from './slices/favorites';

// ----------------------------------------------------------------------

const checkoutPersistConfig = {
  key: 'checkout',
  storage,
  keyPrefix: 'redux-',
  whitelist: ['cart', 'subTotal', 'total', 'discount', 'appliedCoupon', 'shipping', 'totalItems', 'paymentSession'],
};

// Favorites are owned by the backend and are per-user, so they are not persisted.
// They are hydrated from the API on auth change by <FavoritesInitializer />.
export const rootReducer = combineReducers({
  checkout: persistReducer(checkoutPersistConfig, checkoutReducer),
  favorites: favoritesReducer,
});
