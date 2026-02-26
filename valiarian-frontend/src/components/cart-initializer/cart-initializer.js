import { useEffect } from 'react';
// auth
import { useAuthContext } from 'src/auth/hooks';
// redux
import { getCart } from 'src/redux/slices/checkout';
import { useDispatch } from 'src/redux/store';
// utils
import { loadCartOnInit } from 'src/utils/cart-initialization';

// ----------------------------------------------------------------------

export default function CartInitializer({ children }) {
  const { authenticated, user } = useAuthContext();
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize cart on app start
    loadCartOnInit(authenticated, user?.id, dispatch, getCart);
  }, [authenticated, user?.id, dispatch]);

  return children;
}
