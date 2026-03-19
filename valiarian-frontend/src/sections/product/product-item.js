import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
// routes
import { RouterLink } from 'src/routes/components';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// utils
import { fCurrency } from 'src/utils/format-number';
// components
import { ColorPreview } from 'src/components/color-utils';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import Label from 'src/components/label';
// checkout
import { useCheckout } from './hooks';

// ----------------------------------------------------------------------

export default function ProductItem({ product }) {
  // Get default variant or first variant if available
  const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];

  // Use variant data if available, otherwise fallback to product data
  const displayImage = defaultVariant?.images?.[0] || product.coverImage;
  const displayPrice = defaultVariant?.price || product.price;
  const displayStock = defaultVariant?.stockQuantity ?? product.stockQuantity;
  const displayInStock = defaultVariant?.inStock ?? product.inStock;

  // Get unique colors and sizes from variants
  const availableColors = product.variants && product.variants.length > 0
    ? [...new Set(product.variants.map(v => v.color))]
    : (product.colors || []);

  const availableSizes = product.variants && product.variants.length > 0
    ? [...new Set(product.variants.map(v => v.size))]
    : (product.sizes || []);

  // Updated destructuring to use new field names
  const { id, slug, name, salePrice, isNewArrival, isBestSeller } = product;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { onAddCart } = useCheckout();

  // Use slug for SEO-friendly URLs, fallback to id if slug doesn't exist
  const linkTo = paths.product.details(slug || id);

  // Calculate discount percentage using display price
  const discountPercent = salePrice && displayPrice > 0
    ? Math.round(((displayPrice - salePrice) / displayPrice) * 100)
    : 0;

  const handleAddCart = async (e) => {
    // Prevent navigation when clicking Add to Cart button
    e.stopPropagation();
    const newProduct = {
      id,
      name,
      coverUrl: displayImage, // Use variant image or product cover image
      available: displayStock, // Use variant stock quantity
      price: salePrice || displayPrice, // Use variant price or sale price
      colors: [availableColors[0]],
      size: availableSizes[0],
      quantity: 1,
      variantId: defaultVariant?.id, // Include variant ID if available
    };
    try {
      await onAddCart(newProduct);
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

  // Updated label logic to use new boolean fields
  const hasNewLabel = isNewArrival;
  const hasSaleLabel = salePrice && salePrice < displayPrice;

  const renderLabels = (hasNewLabel || hasSaleLabel || isBestSeller) && (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ position: 'absolute', zIndex: 9, top: 16, right: 16 }}
    >
      {hasNewLabel && (
        <Label variant="filled" color="info">
          New
        </Label>
      )}
      {hasSaleLabel && (
        <Label variant="filled" color="error">
          Sale
        </Label>
      )}
      {isBestSeller && (
        <Label variant="filled" color="success">
          Best Seller
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
      {/* Color preview at right bottom with count */}
      {availableColors.length > 0 && (
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
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ColorPreview colors={availableColors.slice(0, 3)} />
            {availableColors.length > 3 && (
              <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
                +{availableColors.length - 3}
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Size count badge at left bottom */}
      {availableSizes.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            zIndex: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: 1,
            padding: '4px 8px',
            pointerEvents: 'none',
          }}
        >
          <Box component="span" sx={{ typography: 'caption', fontWeight: 600 }}>
            {availableSizes.length} {availableSizes.length === 1 ? 'Size' : 'Sizes'}
          </Box>
        </Box>
      )}

      {/* Out of Stock Overlay */}
      {!displayInStock && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 7,
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              px: 2,
              py: 1,
              borderRadius: 1,
            }}
          >
            <Box component="span" sx={{ typography: 'subtitle2', color: 'error.main' }}>
              Out of Stock
            </Box>
          </Box>
        </Box>
      )}

      <Image alt={name} src={displayImage} ratio="1/1" />
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
          {/* Selling Price (discounted price if sale exists, otherwise variant/regular price) - clickable on desktop */}
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
            {salePrice ? fCurrency(salePrice) : fCurrency(displayPrice)}
          </Box>

          {/* Actual/Original Price (show only if sale exists, with strikethrough) */}
          {salePrice && (
            <Box component="span" sx={{ color: 'text.disabled', typography: 'caption', textDecoration: 'line-through' }}>
              {fCurrency(displayPrice)}
            </Box>
          )}
        </Stack>

        {/* Discount Percentage (show only if sale exists, below price) */}
        {salePrice && discountPercent > 0 && (
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
