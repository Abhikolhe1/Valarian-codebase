import { useEffect, useState } from 'react';
// @mui
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// redux
import { addToCart } from 'src/redux/slices/checkout';
import { loadFavorites, revertFavorites, toggleFavorite } from 'src/redux/slices/favorites';
import { useDispatch, useSelector } from 'src/redux/store';
// auth
import { useAuthContext } from 'src/auth/hooks';
// utils
import axios from 'src/utils/axios';
import { removeFavorite } from 'src/api/favorites';
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
  const [favoriteEntries, setFavoriteEntries] = useState([]);

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
        dispatch(loadFavorites(favoritesData.map((item) => ({ productId: item.productId }))));
        setFavoriteEntries(favoritesData);
      } catch (error) {
        console.error('Error loading favorites:', error);
        // If 404, just show empty favorites
        if (error.status === 404 || error.statusCode === 404) {
          dispatch(loadFavorites([]));
          setFavoriteEntries([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadFavoritesData();
  }, [authenticated, user, dispatch]);

  const handleRemoveFavorite = async (productId) => {
    const previousFavorites = favorites;
    const previousEntries = favoriteEntries;

    dispatch(toggleFavorite(productId));
    setFavoriteEntries((prev) => prev.filter((item) => item.productId !== productId));

    try {
      await removeFavorite(productId);
    } catch (error) {
      dispatch(revertFavorites(previousFavorites));
      setFavoriteEntries(previousEntries);
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleAddToCart = (product) => {
    const cartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.salePrice || product.price,
      salePrice: product.salePrice,
      quantity: 1,
      image: product.coverImage || product.images?.[0],
      coverImage: product.coverImage || product.images?.[0],
      colors: [],
    };
    dispatch(addToCart(cartItem));
  };

  if (!authenticated) {
    return null;
  }

  const empty = !loading && favoriteEntries.length === 0;
  let content = null;

  if (loading) {
    content = (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <CircularProgress color="inherit" />
      </Stack>
    );
  } else if (empty) {
    content = (
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
            sx={{ mt: 2 }}
          >
            Continue Shopping
          </Button>
        }
      />
    );
  } else {
    content = (
      <Grid container spacing={3}>
        {favoriteEntries.map(({ productId, product }) => (
          <Grid key={productId} xs={12} sm={6} md={4} lg={3}>
            <FavoritesProductCard
              product={product}
              onRemove={() => handleRemoveFavorite(productId)}
              onAddToCart={() => handleAddToCart(product)}
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'} sx={{ py: { xs: 5, md: 10 } }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        My Favorites
      </Typography>

      {content}
    </Container>
  );
}
