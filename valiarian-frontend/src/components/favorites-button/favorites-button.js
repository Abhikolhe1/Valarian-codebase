import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
// @mui
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
// api
import { addFavorite, removeFavorite } from 'src/api/favorites';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// redux
import { revertFavorites, toggleFavorite } from 'src/redux/slices/favorites';
import { useDispatch, useSelector } from 'src/redux/store';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function FavoritesButton({
  productId,
  sx,
  iconSize = 20,
  showTooltip = true,
  inactiveColor = 'text.secondary',
  activeColor = 'error.main',
}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { authenticated } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const favorites = useSelector((state) => state.favorites.items);

  // Check if product is favorited
  const isFavorited = useSelector((state) =>
    state.favorites.items.some((item) => item.productId === productId)
  );

  const handleToggleFavorite = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!authenticated) {
        router.push(paths.auth.jwt.login);
        return;
      }

      if (isSubmitting) {
        return;
      }

      const previousFavorites = favorites;

      dispatch(toggleFavorite(productId));
      setIsSubmitting(true);

      (async () => {
        try {
          if (isFavorited) {
            await removeFavorite(productId);
          } else {
            await addFavorite(productId);
          }
        } catch (error) {
          dispatch(revertFavorites(previousFavorites));
          console.error('Failed to update favorites:', error);
        } finally {
          setIsSubmitting(false);
        }
      })();
    },
    [authenticated, dispatch, favorites, isFavorited, isSubmitting, productId, router]
  );

  const button = (
    <IconButton
      onClick={handleToggleFavorite}
      disabled={isSubmitting}
      sx={{
        color: isFavorited ? activeColor : inactiveColor,
        '&:hover': {
          color: activeColor,
        },
        ...sx,
      }}
    >
      <Iconify
        icon={isFavorited ? 'eva:heart-fill' : 'eva:heart-outline'}
        width={iconSize}
      />
    </IconButton>
  );

  if (showTooltip) {
    return (
      <Tooltip title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
        {button}
      </Tooltip>
    );
  }

  return button;
}

FavoritesButton.propTypes = {
  activeColor: PropTypes.string,
  inactiveColor: PropTypes.string,
  productId: PropTypes.string.isRequired,
  sx: PropTypes.object,
  iconSize: PropTypes.number,
  showTooltip: PropTypes.bool,
};
