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
  whitelist: ['cart', 'subTotal', 'total', 'discount', 'shipping', 'totalItems'],
};

const favoritesPersistConfig = {
  key: 'favorites',
  storage,
  keyPrefix: 'redux-',
};

export const rootReducer = combineReducers({
  checkout: persistReducer(checkoutPersistConfig, checkoutReducer),
  favorites: persistReducer(favoritesPersistConfig, favoritesReducer),
});
