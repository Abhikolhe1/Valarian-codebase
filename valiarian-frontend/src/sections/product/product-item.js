import { memo, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { LoadingButton } from '@mui/lab';
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
import FavoritesButton from 'src/components/favorites-button';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';
import Label from 'src/components/label';
// checkout
import { useCheckout } from './hooks';

// ----------------------------------------------------------------------

function ProductItem({ product }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const [loadingCart, setLoadingCart] = useState(false);
  const { onAddCart } = useCheckout();

  const productView = useMemo(() => {
    const defaultVariant = product.variants?.find((variant) => variant.isDefault) || product.variants?.[0];
    const displayImage = defaultVariant?.images?.[0] || product.coverImage;
    const displayPrice = defaultVariant?.price || product.price;
    const displayStock = defaultVariant?.stockQuantity ?? product.stockQuantity;
    const displayInStock = defaultVariant?.inStock ?? product.inStock;
    const availableColors =
      product.variants && product.variants.length > 0
        ? [...new Set(product.variants.map((variant) => variant.color).filter(Boolean))]
        : product.colors || [];
    const availableSizes =
      product.variants && product.variants.length > 0
        ? [...new Set(product.variants.map((variant) => variant.size).filter(Boolean))]
        : product.sizes || [];
    const linkTo = paths.product.details(product.slug || product.id);
    const discountPercent =
      product.salePrice && displayPrice > 0
        ? Math.round(((displayPrice - product.salePrice) / displayPrice) * 100)
        : 0;

    return {
      defaultVariant,
      displayImage,
      displayPrice,
      displayStock,
      displayInStock,
      availableColors,
      availableSizes,
      linkTo,
      discountPercent,
      hasNewLabel: product.isNewArrival,
      hasSaleLabel: product.salePrice && product.salePrice < displayPrice,
      isBestSeller: product.isBestSeller,
    };
  }, [product]);

  const handleAddCart = useCallback(
    async (event) => {
      event.stopPropagation();
      setLoadingCart(true);

      const newProduct = {
        productId: product.id,
        name: product.name,
        coverUrl: productView.displayImage,
        available: productView.displayStock,
        price: product.salePrice || productView.displayPrice,
        colors: [productView.availableColors[0]],
        size: productView.availableSizes[0],
        quantity: 1,
        variantId: productView.defaultVariant?.id,
      };

      try {
        await onAddCart(newProduct);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingCart(false);
      }
    },
    [onAddCart, product.id, product.name, product.salePrice, productView]
  );

  const handleCardClick = useCallback(() => {
    if (isMobile) {
      router.push(productView.linkTo);
    }
  }, [isMobile, productView.linkTo, router]);

  const renderLabels =
    (productView.hasNewLabel || productView.hasSaleLabel || productView.isBestSeller) && (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ position: 'absolute', zIndex: 9, top: 16, right: 16 }}
      >
        {productView.hasNewLabel && (
          <Label variant="filled" color="info">
            New
          </Label>
        )}
        {productView.hasSaleLabel && (
          <Label variant="filled" color="error">
            Sale
          </Label>
        )}
        {productView.isBestSeller && (
          <Label variant="filled" color="success">
            Best Seller
          </Label>
        )}
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

      <Box
        component={isMobile ? 'div' : RouterLink}
        href={isMobile ? undefined : productView.linkTo}
        sx={{
          position: 'relative',
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'block',
        }}
      >
        <FavoritesButton
          productId={product.id}
          showTooltip={false}
          inactiveColor="common.black"
          activeColor="error.main"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.92)',
            },
          }}
        />

        {productView.availableColors.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              right: 20,
              bottom: 20,
              zIndex: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 1,
              padding: '4px 8px',
              pointerEvents: 'none',
            }}
          >
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ColorPreview colors={productView.availableColors.slice(0, 3)} />
              {productView.availableColors.length > 3 && (
                <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
                  +{productView.availableColors.length - 3}
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {productView.availableSizes.length > 0 && (
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
              {productView.availableSizes.length}{' '}
              {productView.availableSizes.length === 1 ? 'Size' : 'Sizes'}
            </Box>
          </Box>
        )}

        {!productView.displayInStock && (
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

        <Image
          alt={product.name}
          src={productView.displayImage}
          ratio="1/1"
          loading="lazy"
          threshold={200}
          wrapperProps={{ style: { display: 'block' } }}
          useIntersectionObserver
        />
      </Box>

      <Stack spacing={2.5} sx={{ p: 3, pt: 2, flexGrow: 1 }}>
        <Link
          component={RouterLink}
          href={productView.linkTo}
          color="inherit"
          variant="subtitle2"
          noWrap
          sx={{ cursor: 'pointer' }}
        >
          {product.name}
        </Link>

        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'subtitle1' }}>
            <Box
              component={isMobile ? 'span' : RouterLink}
              href={isMobile ? undefined : productView.linkTo}
              sx={{
                fontWeight: 600,
                cursor: isMobile ? 'default' : 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': isMobile ? {} : { textDecoration: 'underline' },
              }}
            >
              {product.salePrice ? fCurrency(product.salePrice) : fCurrency(productView.displayPrice)}
            </Box>

            {product.salePrice && (
              <Box
                component="span"
                sx={{ color: 'text.disabled', typography: 'caption', textDecoration: 'line-through' }}
              >
                {fCurrency(productView.displayPrice)}
              </Box>
            )}
          </Stack>

          {product.salePrice && productView.discountPercent > 0 && (
            <Box
              component="span"
              sx={{
                typography: 'caption',
                color: 'text.secondary',
              }}
            >
              ({productView.discountPercent}% off)
            </Box>
          )}
        </Stack>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mt: 'auto',
            position: 'relative',
            zIndex: 10,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <LoadingButton
            variant="contained"
            color="primary"
            size="small"
            onClick={handleAddCart}
            loading={loadingCart}
            startIcon={<Iconify icon="solar:cart-plus-bold" width={20} />}
            sx={{ minWidth: 'auto' }}
          >
            Add to Cart
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );
}

ProductItem.propTypes = {
  product: PropTypes.object,
};

export default memo(ProductItem);
