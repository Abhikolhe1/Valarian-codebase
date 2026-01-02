import PropTypes from 'prop-types';
// @mui
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
// utils
import { fCurrency } from 'src/utils/format-number';
// redux
import { useDispatch } from 'src/redux/store';
import { addToCart } from 'src/redux/slices/checkout';
// components
import Label from 'src/components/label';
import Image from 'src/components/image';
import Iconify from 'src/components/iconify';
import { ColorPreview } from 'src/components/color-utils';

// ----------------------------------------------------------------------

export default function ProductItem({ product }) {
  const { id, name, coverUrl, price, colors, available, sizes, priceSale, newLabel, saleLabel } =
    product;

  const dispatch = useDispatch();

  const linkTo = paths.product.details(id);

  // Calculate discount percentage
  const discountPercent = priceSale && price > 0 
    ? Math.round(((price - priceSale) / price) * 100) 
    : 0;

  const handleAddCart = async () => {
    const newProduct = {
      id,
      name,
      coverUrl,
      available,
      price,
      colors: [colors[0]],
      size: sizes[0],
      quantity: 1,
    };
    try {
      dispatch(addToCart(newProduct));
    } catch (error) {
      console.error(error);
    }
  };

  const renderLabels = (newLabel.enabled || saleLabel.enabled) && (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ position: 'absolute', zIndex: 9, top: 16, right: 16 }}
    >
      {newLabel.enabled && (
        <Label variant="filled" color="info">
          {newLabel.content}
        </Label>
      )}
      {saleLabel.enabled && (
        <Label variant="filled" color="error">
          {saleLabel.content}
        </Label>
      )}
    </Stack>
  );

  const renderImg = (
    <Box sx={{ position: 'relative'}}>
      <Fab
        color="warning"
        size="medium"
        className="add-cart-btn"
        onClick={handleAddCart}
        sx={{
          right: 24,
          bottom: 24,
          zIndex: 9,
          opacity: 0,
          position: 'absolute',
          transition: (theme) =>
            theme.transitions.create('all', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.shorter,
            }),
        }}
      >
        <Iconify icon="solar:cart-plus-bold" width={24} />
      </Fab>

      {/* Color preview at right bottom */}
      <Box
        sx={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          zIndex: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1,
          padding: '4px 8px',
        }}
      >
        <ColorPreview colors={colors} />
      </Box>

      <Image alt={name} src={coverUrl} ratio="1/1" />
    </Box>
  );

  const renderContent = (
    <Stack spacing={2.5} sx={{ p: 3, pt: 2, flexGrow: 1 }}>
      <Link component={RouterLink} href={linkTo} color="inherit" variant="subtitle2" noWrap>
        {name}
      </Link>

      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'subtitle1' }}>
          {/* Selling Price (discounted price if sale exists, otherwise regular price) */}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {priceSale ? fCurrency(priceSale) : fCurrency(price)}
          </Box>

          {/* Actual/Original Price (show only if sale exists, with strikethrough) */}
          {priceSale && (
            <Box component="span" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
              {fCurrency(price)}
            </Box>
          )}
        </Stack>

        {/* Discount Percentage (show only if sale exists, below price) */}
        {priceSale && discountPercent > 0 && (
          <Box
            component="span"
            sx={{
              typography: 'caption',
              color: 'text.secondary',
            }}
          >
            ({discountPercent}% off)
          </Box>
        )}
      </Stack>
    </Stack>
  );

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover .add-cart-btn': {
          opacity: 1,
        },
      }}
    >
      {renderLabels}

      {renderImg}

      {renderContent}
    </Card>
  );
}

ProductItem.propTypes = {
  product: PropTypes.object,
};
