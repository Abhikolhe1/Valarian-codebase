import { useEffect } from 'react';
// auth
import { useAuthContext } from 'src/auth/hooks';
// redux
import { clearFavorites, loadFavorites, setLoading } from 'src/redux/slices/favorites';
import { useDispatch } from 'src/redux/store';
// utils
import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export default function FavoritesInitializer({ children }) {
  const { authenticated, user } = useAuthContext();
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    const initializeFavorites = async () => {
      // Guests have no favorites - never leave a previous user's count behind
      if (!authenticated || !user?.id) {
        dispatch(clearFavorites());
        return;
      }

      try {
        dispatch(setLoading(true));

        const response = await axios.get(endpoints.favorites.get(user.id));
        const favorites = response.data?.favorites || [];

        if (cancelled) return;

        dispatch(loadFavorites(favorites.map((item) => ({ productId: item.productId }))));
      } catch (error) {
        console.error('Error initializing favorites:', error);

        if (cancelled) return;

        // No favorites yet (404) or the request failed - fall back to empty
        dispatch(loadFavorites([]));
      }
    };

    initializeFavorites();

    return () => {
      cancelled = true;
    };
  }, [authenticated, user?.id, dispatch]);

  return children;
}
