import PropTypes from 'prop-types';
import { memo, useCallback, useMemo, useState } from 'react';
// @mui
import { LoadingButton } from '@mui/lab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
// routes
import { RouterLink } from 'src/routes/components';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// redux
import { useSelector } from 'src/redux/store';
// utils
import { getCartItemKey } from 'src/utils/cart-utils';
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
  const cart = useSelector((state) => state.checkout.cart);
  const [loadingCart, setLoadingCart] = useState(false);
  const { onAddCart } = useCheckout();

  const productView = useMemo(() => {
    const defaultVariant =
      product.variants?.find((variant) => variant.isDefault) || product.variants?.[0];
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

  const selectedCartKey = getCartItemKey({
    id: product.id,
    variantId: productView.defaultVariant?.id,
  });
  const existingCartItem = cart.find((item) => item.key === selectedCartKey);
  const isAlreadyInCart = Boolean(existingCartItem);
  const isMaxQuantity = existingCartItem
    ? existingCartItem.quantity >= productView.displayStock
    : false;
  const hasResolvedVariantConstraints =
    !product.variants?.length ||
    Boolean(
      productView.defaultVariant &&
      (!productView.availableColors.length || productView.availableColors[0]) &&
      (!productView.availableSizes.length || productView.availableSizes[0])
    );
  const isAddToCartDisabled =
    isAlreadyInCart ||
    isMaxQuantity ||
    !productView.displayInStock ||
    productView.displayStock < 1 ||
    !hasResolvedVariantConstraints;

  const handleAddCart = useCallback(
    async (event) => {
      event.stopPropagation();
      if (isAddToCartDisabled) {
        return;
      }

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
    [isAddToCartDisabled, onAddCart, product.id, product.name, product.salePrice, productView]
  );

  const handleCardClick = useCallback(() => {
    if (isMobile) {
      router.push(productView.linkTo);
    }
  }, [isMobile, productView.linkTo, router]);

  const handleGoToCart = useCallback(
    (event) => {
      event.stopPropagation();
      router.push(paths.product.checkout);
    },
    [router]
  );

  const renderLabels =
    (productView.hasNewLabel || productView.hasSaleLabel || productView.isBestSeller) && (
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.5, sm: 1 }}
      // sx={{
      //   position: 'absolute',
      //   zIndex: 9,
      //   top: { xs: 8, sm: 16 },
      //   right: { xs: 8, sm: 16 },
      // }}
      >
        {productView.hasNewLabel && (
          <Label
            variant="filled"
            color="info"
            sx={{
              fontSize: { xs: '10px', sm: '12px' },
              px: { xs: 0.6, sm: 1.2 },
              py: { xs: 0.2, sm: 0.4 },
            }}
          >
            New
          </Label>
        )}

        {productView.hasSaleLabel && (
          <Label
            variant="filled"
            color="error"
            sx={{
              fontSize: { xs: '10px', sm: '12px' },
              px: { xs: 0.6, sm: 1.2 },
              py: { xs: 0.2, sm: 0.4 },
            }}
          >
            Sale
          </Label>
        )}

        {productView.isBestSeller && (
          <Label
            variant="filled"
            color="success"
            sx={{
              fontSize: { xs: '10px', sm: '12px' },
              px: { xs: 0.6, sm: 1.2 },
              py: { xs: 0.2, sm: 0.4 },
            }}
          >
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
      {/* {renderLabels} */}

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
            top: { xs: 6, sm: 12 },
            left: { xs: 4, sm: 12 },
            px: { xs: 0.3, sm: 1.2 },
            py: { xs: 0.3, sm: 1.2 },
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
              right: { xs: 8, sm: 16 },
              bottom: { xs: 8, sm: 16 },
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
              left: { xs: 8, sm: 16 },
              px: { xs: 0.6, sm: 0.9 },
              py: { xs: 0, sm: 0.5 },
              bottom: { xs: 8, sm: 16 },
              zIndex: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: 1,
              padding: '4px 8px',
              pointerEvents: 'none',
            }}
          >
            <Box component="span" sx={{ typography: 'caption', fontWeight: 600, fontSize: { xs: 11, sm: 13 } }}>
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

      <Stack spacing={{ xs: 0.5, md: 1.5 }} sx={{ p: { xs: 2, md: 2 }, pt: 2, flexGrow: 1 }}>
        <Link
          component={RouterLink}
          href={productView.linkTo}
          color="inherit"
          noWrap
          sx={{
            cursor: 'pointer',
            typography: { xs: 'subtitle2', md: 'subtitle1' },
          }}
        >
          {product.name}
        </Link>

        <Stack>
          {renderLabels}
        </Stack>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'subtitle1' }}>
            <Box
              component={isMobile ? 'span' : RouterLink}
              href={isMobile ? undefined : productView.linkTo}
              sx={{
                fontWeight: 600,
                fontSize: { xs: 11, sm: 14 },
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
                sx={{ color: 'text.disabled', typography: 'caption', textDecoration: 'line-through', fontSize: { xs: 11, sm: 14 }, }}
              >
                {fCurrency(productView.displayPrice)}
              </Box>
            )}


            {product.salePrice && productView.discountPercent > 0 && (
              <Box
                component="span"
                sx={{
                  typography: 'caption',
                  color: 'text.secondary',
                  fontSize: { xs: 11, sm: 14 },
                }}
              >
                ({productView.discountPercent}% off)
              </Box>
            )}
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            mt: 'auto',
            position: 'relative',
            zIndex: 10,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {isAlreadyInCart ? (
            <LoadingButton
              fullWidth
              variant="contained"
              color="primary"
              size="small"
              onClick={handleGoToCart}
              startIcon={<Iconify icon="solar:cart-check-bold" width={20} />}
            >
              Go to Cart
            </LoadingButton>
          ) : (
            <LoadingButton
              fullWidth
              variant="contained"
              color="primary"
              size="small"
              onClick={handleAddCart}
              disabled={isAddToCartDisabled}
              loading={loadingCart}
              startIcon={<Iconify icon="solar:cart-plus-bold" width={20} />}
            >
              {!productView.displayInStock || productView.displayStock < 1
                ? 'Out of Stock'
                : 'Add to Cart'}
            </LoadingButton>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

ProductItem.propTypes = {
  product: PropTypes.object,
};

export default memo(ProductItem);
