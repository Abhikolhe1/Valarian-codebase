import { useEffect, useState } from 'react';
// @mui
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// redux
import { addToCart } from 'src/redux/slices/checkout';
import { loadFavorites, toggleFavorite } from 'src/redux/slices/favorites';
import { useDispatch, useSelector } from 'src/redux/store';
// auth
import { useAuthContext } from 'src/auth/hooks';
// utils
import axios from 'src/utils/axios';
// components
import EmptyContent from 'src/components/empty-content';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
//
import FavoritesProductCard from './favorites-product-card';

// ----------------------------------------------------------------------

export default function FavoritesView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const dispatch = useDispatch();
  const { authenticated, user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  const favorites = useSelector((state) => state.favorites.items);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push(paths.auth.jwt.login);
    }
  }, [authenticated, router]);

  // Load favorites from backend
  useEffect(() => {
    const loadFavoritesData = async () => {
      if (!authenticated || !user) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/favorites/${user.id}`);
        const favoritesData = response.data.favorites || [];
        dispatch(loadFavorites(favoritesData));

        // Fetch product details for each favorite
        // TODO: Replace with actual API call to fetch products by IDs
        // For now, we'll use mock data
        const productDetails = favoritesData.map((fav) => ({
          id: fav.productId,
          name: 'Product Name',
          price: 99.99,
          image: '/assets/images/products/product_1.jpg',
          // Add more product details as needed
        }));

        setProducts(productDetails);
      } catch (error) {
        console.error('Error loading favorites:', error);
        // If 404, just show empty favorites
        if (error.status === 404 || error.statusCode === 404) {
          dispatch(loadFavorites([]));
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadFavoritesData();
  }, [authenticated, user, dispatch]);

  const handleRemoveFavorite = (productId) => {
    dispatch(toggleFavorite(productId));
    // Remove from local products list
    setProducts((prev) => prev.filter((product) => product.id !== productId));
  };

  const handleAddToCart = (product) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      colors: [],
    };
    dispatch(addToCart(cartItem));
  };

  if (!authenticated) {
    return null;
  }

  const empty = !loading && products.length === 0;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 10 } }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        My Favorites
      </Typography>

      {empty ? (
        <EmptyContent
          filled
          title="No Favorites Yet!"
          description="You haven't added any products to your favorites. Start browsing and save your favorite items here."
          imgUrl="/assets/icons/empty/ic_cart.svg"
          sx={{
            py: 10,
          }}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              onClick={() => router.push(paths.product.root)}
            >
              Continue Shopping
            </Button>
          }
        />
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid key={product.id} xs={12} sm={6} md={4} lg={3}>
              <FavoritesProductCard
                product={product}
                onRemove={() => handleRemoveFavorite(product.id)}
                onAddToCart={() => handleAddToCart(product)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
