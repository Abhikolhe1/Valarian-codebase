import PropTypes from 'prop-types';
// @mui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter } from 'src/routes/hook';
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const router = useRouter();

  const linkTo = paths.product.details(id);

  // Calculate discount percentage
  const discountPercent = priceSale && price > 0
    ? Math.round(((price - priceSale) / price) * 100)
    : 0;

  const handleAddCart = async (e) => {
    // Prevent navigation when clicking Add to Cart button
    e.stopPropagation();
    const newProduct = {
      id,
      name,
      coverUrl,
      available,
      price: priceSale || price,
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

  // Handle card click for mobile - navigate to product details
  const handleCardClick = () => {
    if (isMobile) {
      router.push(linkTo);
    }
  };

  // Safely check labels
  const hasNewLabel = newLabel?.enabled;
  const hasSaleLabel = saleLabel?.enabled;

  const renderLabels = (hasNewLabel || hasSaleLabel) && (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ position: 'absolute', zIndex: 9, top: 16, right: 16 }}
    >
      {hasNewLabel && (
        <Label variant="filled" color="info">
          {newLabel.content}
        </Label>
      )}
      {hasSaleLabel && (
        <Label variant="filled" color="error">
          {saleLabel.content}
        </Label>
      )}
    </Stack>
  );

  const renderImg = (
    <Box
      component={isMobile ? 'div' : RouterLink}
      href={isMobile ? undefined : linkTo}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'block',
      }}
      onClick={(e) => {
        if (!isMobile) {
          // On desktop, let the RouterLink handle navigation
          // On mobile, let the event bubble up to card click handler
        }
      }}
    >
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
          pointerEvents: 'none', // Prevent color preview from blocking clicks
        }}
      >
        <ColorPreview colors={colors} />
      </Box>

      <Image alt={name} src={coverUrl} ratio="1/1" />
    </Box>
  );

  const renderContent = (
    <Stack spacing={2.5} sx={{ p: 3, pt: 2, flexGrow: 1 }}>
      <Link
        component={RouterLink}
        href={linkTo}
        color="inherit"
        variant="subtitle2"
        noWrap
        sx={{ cursor: 'pointer' }}
      >
        {name}
      </Link>

      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'subtitle1' }}>
          {/* Selling Price (discounted price if sale exists, otherwise regular price) - clickable on desktop */}
          <Box
            component={isMobile ? 'span' : RouterLink}
            href={isMobile ? undefined : linkTo}
            sx={{
              fontWeight: 600,
              cursor: isMobile ? 'default' : 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': isMobile ? {} : { textDecoration: 'underline' },
            }}
          >
            {priceSale ? fCurrency(priceSale) : fCurrency(price)}
          </Box>

          {/* Actual/Original Price (show only if sale exists, with strikethrough) */}
          {priceSale && (
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption', textDecoration: 'line-through' }}>
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

      {/* Add to Cart Button at bottom right */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: 'auto',
          position: 'relative',
          zIndex: 10, // Ensure button is above card click area on mobile
        }}
        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking button
      >
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleAddCart}
          startIcon={<Iconify icon="solar:cart-plus-bold" width={20} />}
          sx={{ minWidth: 'auto' }}
        >
          Add to Cart
        </Button>
      </Box>
    </Stack>
  );

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: isMobile ? 'pointer' : 'default',
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
