import { createSlice } from '@reduxjs/toolkit';

// ----------------------------------------------------------------------

const initialState = {
  items: [],
  loading: false,
  synced: true,
};

const slice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    // Load favorites from backend
    loadFavorites(state, action) {
      state.items = action.payload;
      state.synced = true;
      state.loading = false;
    },

    // Set loading state
    setLoading(state, action) {
      state.loading = action.payload;
    },

    // Toggle favorite (add or remove)
    toggleFavorite(state, action) {
      const productId = action.payload;
      const existingIndex = state.items.findIndex((item) => item.productId === productId);

      if (existingIndex >= 0) {
        // Product is favorited - remove it
        state.items = state.items.filter((item) => item.productId !== productId);
      } else {
        // Product is not favorited - add it
        state.items = [
          ...state.items,
          {
            productId,
            addedAt: new Date().toISOString(),
          },
        ];
      }

      // Mark as not synced (optimistic update)
      state.synced = false;
    },

    // Update sync status
    setSynced(state, action) {
      state.synced = action.payload;
    },

    // Revert to previous state (on sync failure)
    revertFavorites(state, action) {
      state.items = action.payload;
      state.synced = true;
    },

    // Clear all favorites
    clearFavorites(state) {
      state.items = [];
      state.synced = true;
      state.loading = false;
    },
  },
});

// Reducer
export default slice.reducer;

// Actions
export const {
  loadFavorites,
  setLoading,
  toggleFavorite,
  setSynced,
  revertFavorites,
  clearFavorites,
} = slice.actions;
