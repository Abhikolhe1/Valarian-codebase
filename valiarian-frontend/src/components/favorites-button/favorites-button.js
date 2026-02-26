import PropTypes from 'prop-types';
import { useCallback } from 'react';
// @mui
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
// redux
import { toggleFavorite } from 'src/redux/slices/favorites';
import { useDispatch, useSelector } from 'src/redux/store';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function FavoritesButton({ productId, sx, iconSize = 20, showTooltip = true }) {
  const dispatch = useDispatch();
  const { authenticated } = useAuthContext();

  // Check if product is favorited
  const isFavorited = useSelector((state) =>
    state.favorites.items.some((item) => item.productId === productId)
  );

  const handleToggleFavorite = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!authenticated) {
        // TODO: Show login modal/prompt
        alert('Please log in to add favorites');
        return;
      }

      dispatch(toggleFavorite(productId));
    },
    [authenticated, dispatch, productId]
  );

  const button = (
    <IconButton
      onClick={handleToggleFavorite}
      sx={{
        color: isFavorited ? 'error.main' : 'text.secondary',
        '&:hover': {
          color: 'error.main',
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
  productId: PropTypes.string.isRequired,
  sx: PropTypes.object,
  iconSize: PropTypes.number,
  showTooltip: PropTypes.bool,
};
