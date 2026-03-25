import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// utils
import { fCurrency } from 'src/utils/format-number';
// components
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';

// ----------------------------------------------------------------------

export default function FavoritesProductCard({ product, onRemove, onAddToCart }) {
  const router = useRouter();
  const displayImage = product?.coverImage || product?.image || product?.images?.[0];
  const linkTarget = paths.product.details(product?.slug || product?.id);
  const displayPrice = product?.salePrice || product?.price || 0;

  const handleViewProduct = () => {
    router.push(linkTarget);
  };

  return (
    <Card
      sx={{
        position: 'relative',
        '&:hover': {
          boxShadow: (theme) => theme.customShadows.z24,
        },
      }}
    >
      {/* Remove Button */}
      <Tooltip title="Remove from favorites">
        <IconButton
          onClick={onRemove}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 9,
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
            '&:hover': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <Iconify icon="eva:close-fill" width={20} />
        </IconButton>
      </Tooltip>

      {/* Product Image */}
      <Box
        sx={{
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={handleViewProduct}
      >
        <Image
          alt={product.name}
          src={displayImage}
          ratio="1/1"
          sx={{
            borderRadius: 1.5,
          }}
        />
      </Box>

      {/* Product Info */}
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
          onClick={handleViewProduct}
          noWrap
        >
          {product.name}
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.25}>
            <Typography variant="h6">{fCurrency(displayPrice)}</Typography>
            {!!product.salePrice && !!product.price && product.salePrice < product.price && (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', textDecoration: 'line-through' }}
              >
                {fCurrency(product.price)}
              </Typography>
            )}
          </Stack>

          <Button
            variant="contained"
            size="small"
            startIcon={<Iconify icon="eva:shopping-cart-fill" />}
            onClick={onAddToCart}
          >
            Add to Cart
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

FavoritesProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    price: PropTypes.number,
    salePrice: PropTypes.number,
    image: PropTypes.string,
    coverImage: PropTypes.string,
    slug: PropTypes.string,
    images: PropTypes.array,
  }),
  onRemove: PropTypes.func,
  onAddToCart: PropTypes.func,
};
