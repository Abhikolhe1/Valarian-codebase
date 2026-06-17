import { configureStore } from '@reduxjs/toolkit';
import { useDispatch as useAppDispatch, useSelector as useAppSelector } from 'react-redux';
import { FLUSH, PAUSE, PERSIST, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';
import { cartPersistenceMiddleware } from './middleware/cart-persistence-middleware';
import { rootReducer } from './root-reducer';

// ----------------------------------------------------------------------

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(cartPersistenceMiddleware),
});

export const persistor = persistStore(store);

export const useSelector = useAppSelector;

export const useDispatch = () => useAppDispatch();
