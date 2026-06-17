import { useEffect } from 'react';
// auth
import { useAuthContext } from 'src/auth/hooks';
// redux
import { getCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
// utils
import { hasGuestCart } from 'src/utils/cart-persistence';
import { loadCartOnInit, loadCartOnLogin } from 'src/utils/cart-initialization';

// ----------------------------------------------------------------------

export default function CartInitializer({ children }) {
  const { authenticated, user } = useAuthContext();
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeCart = async () => {
      if (authenticated && user?.id && hasGuestCart()) {
        await loadCartOnLogin(user.id, dispatch, getCart);
        return;
      }

      await loadCartOnInit(authenticated, user?.id, dispatch, getCart);
    };

    initializeCart();
  }, [authenticated, user?.id, dispatch]);

  return children;
}
