import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { formHelperTextClasses } from '@mui/material/FormHelperText';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// api
import { addFavorite, removeFavorite } from 'src/api/favorites';
// auth
import { useAuthContext } from 'src/auth/hooks';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// redux
import { revertFavorites, toggleFavorite } from 'src/redux/slices/favorites';
import { useDispatch, useSelector } from 'src/redux/store';
// utils
import { fCurrency, fShortenNumber } from 'src/utils/format-number';
// components
import { ColorPicker } from 'src/components/color-utils';
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import FormProvider, { RHFSelect } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import { useSnackbar } from 'src/components/snackbar';
import { getCartItemKey } from 'src/utils/cart-utils';
//
import IncrementerButton from './common/incrementer-button';

// ----------------------------------------------------------------------

export default function ProductDetailsSummary({
  cart,
  product,
  onAddCart,
  onBuyNow,
  onGotoStep,
  disabledActions,
  onVariantChange,
  ...other
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { authenticated } = useAuthContext();
  const sharePopover = usePopover();
  const [isFavoriteSubmitting, setIsFavoriteSubmitting] = useState(false);
  const favorites = useSelector((state) => state.favorites.items);

  const {
    id,
    name,
    sizes,
    price,
    coverImage,
    colors,
    inStock,
    stockQuantity,
    salePrice,
    isNewArrival,
    shortDescription,
    variants,
  } = product;

  // State for selected variant
  const [selectedVariant, setSelectedVariant] = useState(null);

  const resolveEffectivePrice = useCallback(
    (variant) => {
      const prioritizedPrices = [variant?.salePrice, salePrice, variant?.price, price];
      const resolvedPrice = prioritizedPrices.find(
        (value) => Number.isFinite(Number(value)) && Number(value) > 0
      );

      return resolvedPrice ? Number(resolvedPrice) : 0;
    },
    [price, salePrice]
  );

  // Set default variant on component mount
  useEffect(() => {
    if (variants && variants.length > 0) {
      const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
      setSelectedVariant(defaultVariant);
    }
  }, [variants]);

  // Get variant-specific values or fallback to product values
  const currentPrice = resolveEffectivePrice(selectedVariant);
  const available = selectedVariant?.stockQuantity ?? stockQuantity ?? 0;
  const variantInStock = selectedVariant?.inStock ?? inStock;
  const variantSKU = selectedVariant?.sku;
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return paths.product.details(id);
    }

    return window.location.href;
  }, [id]);

  const shareTitle = useMemo(() => `${name} | Valarian`, [name]);
  const isFavorited = useMemo(
    () => favorites.some((item) => item.productId === id),
    [favorites, id]
  );

  // Map our product structure to what the component expects
  const coverUrl = coverImage;
  const priceSale = salePrice && salePrice < price ? price : null; // Original price when on sale
  const subDescription = shortDescription || '';
  const totalRatings = product.rating || 0;
  const totalReviews = product.totalReviews || 0;

  // Determine inventory type without nested ternary
  let inventoryType = 'in stock';
  if (!variantInStock) {
    inventoryType = 'out of stock';
  } else if (available < 10) {
    inventoryType = 'low stock';
  }

  // Create label objects from our boolean fields
  const newLabel = { enabled: isNewArrival || false, content: 'New' };
  const saleLabel = { enabled: !!(salePrice && salePrice < price), content: 'Sale' };

  // Get available colors and sizes from variants
  const availableColors =
    variants && variants.length > 0 ? [...new Set(variants.map((v) => v.color))] : colors || [];

  const availableSizes =
    variants && variants.length > 0 ? [...new Set(variants.map((v) => v.size))] : sizes || [];

  const defaultValues = {
    id,
    name,
    coverUrl,
    available,
    price: currentPrice,
    colors: selectedVariant?.color || (availableColors.length > 0 ? availableColors[0] : '#000000'),
    size: selectedVariant?.size || (availableSizes.length > 0 ? availableSizes[0] : 'M'),
    quantity: available < 1 ? 0 : 1,
    variantId: selectedVariant?.id,
  };

  const methods = useForm({
    defaultValues,
  });

  const { reset, watch, control, setValue, handleSubmit } = methods;

  const values = watch();

  useEffect(() => {
    if (product) {
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedVariant]);

  // Handle color change - find matching variant
  const handleColorChange = useCallback(
    (color) => {
      if (variants && variants.length > 0) {
        const variant = variants.find((v) => v.color === color && v.size === values.size);
        if (variant) {
          setSelectedVariant(variant);
          setValue('colors', color);
          setValue('variantId', variant.id);
          setValue('price', resolveEffectivePrice(variant));
          setValue('available', variant.stockQuantity);
          setValue(
            'quantity',
            variant.stockQuantity < 1 ? 0 : Math.min(values.quantity, variant.stockQuantity)
          );
          if (onVariantChange) {
            onVariantChange(variant);
          }
        }
      } else {
        setValue('colors', color);
      }
    },
    [variants, values.size, values.quantity, setValue, onVariantChange, resolveEffectivePrice]
  );

  // Handle size change - find matching variant
  const handleSizeChange = useCallback(
    (size) => {
      if (variants && variants.length > 0) {
        let variant = variants.find(
          (v) => v.color === values.colors && v.size === size && v.inStock && v.stockQuantity > 0
        );

        if (!variant) {
          variant = variants.find((v) => v.size === size && v.inStock && v.stockQuantity > 0);
        }

        setValue('size', size);

        if (variant) {
          setSelectedVariant(variant);
          setValue('colors', variant.color);
          setValue('variantId', variant.id);
          setValue('price', resolveEffectivePrice(variant));
          setValue('available', variant.stockQuantity);
          setValue(
            'quantity',
            variant.stockQuantity < 1 ? 0 : Math.min(values.quantity, variant.stockQuantity)
          );

          if (onVariantChange) {
            onVariantChange(variant);
          }
        } else {
          setSelectedVariant(null);
          setValue('colors', '');
          setValue('variantId', null);
          setValue('available', 0);
          setValue('quantity', 0);
        }
      } else {
        setValue('size', size);
      }
    },
    [variants, values.colors, values.quantity, setValue, onVariantChange, resolveEffectivePrice]
  );

  // Check if a color/size combination is available
  const isColorAvailable = useCallback(
    (color) => {
      if (!variants || variants.length === 0) return true;

      return variants.some(
        (v) => v.color === color && v.size === values.size && v.inStock && v.stockQuantity > 0
      );
    },
    [variants, values.size]
  );
  const filteredAvailableColors = availableColors?.filter((color) => isColorAvailable(color)) || [];

  const isSizeAvailable = useCallback(
    (size) => {
      if (!variants || variants.length === 0) return true;
      return variants.some((v) => v.size === size && v.color === values.colors && v.inStock);
    },
    [variants, values.colors]
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      await onBuyNow({
        ...data,
        colors: [values.colors],
        subTotal: data.price * data.quantity,
        variantId: selectedVariant?.id,
      });
      router.push(paths.product.checkout);
    } catch (error) {
      console.error(error);
    }
  });

  const handleAddCart = useCallback(async () => {
    try {
      await onAddCart({
        ...values,
        colors: [values.colors],
        subTotal: values.price * values.quantity,
        variantId: selectedVariant?.id,
      });
    } catch (error) {
      console.error(error);
    }
  }, [onAddCart, values, selectedVariant]);

  const handleOpenShare = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      sharePopover.setOpen(event.currentTarget);
    },
    [sharePopover]
  );

  const handleCopyLink = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      enqueueSnackbar('Product link copied.', { variant: 'success' });
      sharePopover.onClose();
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Unable to copy product link.', { variant: 'error' });
    }
  }, [enqueueSnackbar, sharePopover, shareUrl]);

  const handleShareTo = useCallback(
    (platform) => {
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(`Check this product: ${name}`);

      const platformUrls = {
        whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      };

      const targetUrl = platformUrls[platform];

      if (targetUrl && typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }

      sharePopover.onClose();
    },
    [name, sharePopover, shareUrl]
  );

  const handleNativeShare = useCallback(async () => {
    try {
      if (navigator?.share) {
        await navigator.share({
          title: shareTitle,
          text: `Check this product: ${name}`,
          url: shareUrl,
        });
      }

      sharePopover.onClose();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        enqueueSnackbar('Unable to open share dialog.', { variant: 'error' });
      }
    }
  }, [enqueueSnackbar, name, sharePopover, shareTitle, shareUrl]);

  const handleToggleFavorite = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!authenticated) {
        router.push(paths.auth.jwt.login);
        return;
      }

      if (isFavoriteSubmitting) {
        return;
      }

      const previousFavorites = favorites;

      dispatch(toggleFavorite(id));
      setIsFavoriteSubmitting(true);

      try {
        if (isFavorited) {
          await removeFavorite(id);
        } else {
          await addFavorite(id);
        }
      } catch (error) {
        dispatch(revertFavorites(previousFavorites));
        console.error('Failed to update favorites:', error);
      } finally {
        setIsFavoriteSubmitting(false);
      }
    },
    [authenticated, dispatch, favorites, id, isFavoriteSubmitting, isFavorited, router]
  );

  // ----------------------------------------------------------------------

  const renderPrice = (
    <Box sx={{ typography: 'h5' }}>
      {priceSale && (
        <Box
          component="span"
          sx={{ color: 'text.disabled', textDecoration: 'line-through', mr: 0.5 }}
        >
          {fCurrency(priceSale)}
        </Box>
      )}

      {fCurrency(currentPrice)}
    </Box>
  );

  const renderShare = (
    <Stack direction="row" spacing={3} justifyContent="center">
      <Link
        variant="subtitle2"
        sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center' }}
      >
        <Iconify icon="mingcute:add-line" width={16} sx={{ mr: 1 }} />
        Compare
      </Link>

      <Box
        component="button"
        type="button"
        onClick={handleToggleFavorite}
        disabled={isFavoriteSubmitting}
        sx={{
          typography: 'subtitle2',
          color: isFavorited ? 'error.main' : 'text.secondary',
          display: 'inline-flex',
          alignItems: 'center',
          border: 0,
          p: 0,
          m: 0,
          backgroundColor: 'transparent',
          cursor: isFavoriteSubmitting ? 'default' : 'pointer',
          '&:hover': { color: 'error.main' },
          '&:disabled': {
            opacity: 0.7,
          },
        }}
      >
        <Iconify
          icon={isFavorited ? 'eva:heart-fill' : 'eva:heart-outline'}
          width={16}
          sx={{ mr: 1 }}
        />
        Favorite
      </Box>

      <Box
        component="button"
        type="button"
        sx={{
          typography: 'subtitle2',
          color: 'text.secondary',
          display: 'inline-flex',
          alignItems: 'center',
          border: 0,
          p: 0,
          m: 0,
          backgroundColor: 'transparent',
          cursor: 'pointer',
          '&:hover': { color: 'text.primary' },
        }}
        onClick={handleOpenShare}
      >
        <Iconify icon="solar:share-bold" width={16} sx={{ mr: 1 }} />
        Share
      </Box>

      <CustomPopover
        open={sharePopover.open}
        onClose={sharePopover.onClose}
        arrow="top-right"
        sx={{ width: 220, p: 0.5 }}
      >
        <MenuItem onClick={handleCopyLink}>
          <Iconify icon="solar:link-bold" />
          Copy Link
        </MenuItem>

        <MenuItem onClick={() => handleShareTo('whatsapp')}>
          <Iconify icon="ic:baseline-whatsapp" />
          WhatsApp
        </MenuItem>

        <MenuItem onClick={() => handleShareTo('telegram')}>
          <Iconify icon="ic:baseline-telegram" />
          Telegram
        </MenuItem>

        <MenuItem onClick={() => handleShareTo('facebook')}>
          <Iconify icon="ri:facebook-fill" />
          Facebook
        </MenuItem>

        <MenuItem onClick={() => handleShareTo('x')}>
          <Iconify icon="ri:twitter-x-fill" />X
        </MenuItem>

        {typeof navigator !== 'undefined' && navigator.share && (
          <MenuItem onClick={handleNativeShare}>
            <Iconify icon="solar:share-bold" />
            More Options
          </MenuItem>
        )}
      </CustomPopover>
    </Stack>
  );

  const renderColorOptions = filteredAvailableColors.length > 0 && (
    <Stack direction="row">
      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
        Color
      </Typography>

      <Controller
        name="colors"
        control={control}
        render={({ field }) => (
          <ColorPicker
            colors={filteredAvailableColors}
            selected={field.value}
            onSelectColor={(color) => {
              field.onChange(color);
              handleColorChange(color);
            }}
            limit={4}
          />
        )}
      />
    </Stack>
  );

  const renderSizeOptions = availableSizes && availableSizes.length > 0 && (
    <Stack direction="row">
      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
        Size
      </Typography>

      <RHFSelect
        name="size"
        size="small"
        onChange={(e) => handleSizeChange(e.target.value)}
        helperText={
          <Link underline="always" color="textPrimary">
            Size Chart
          </Link>
        }
        sx={{
          maxWidth: 88,
          [`& .${formHelperTextClasses.root}`]: {
            mx: 0,
            mt: 1,
            textAlign: 'right',
          },
        }}
      >
        {availableSizes.map((size) => (
          <MenuItem key={size} value={size}>
            {size}
          </MenuItem>
        ))}
      </RHFSelect>
    </Stack>
  );

  const renderQuantity = (
    <Stack direction="row">
      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
        Quantity
      </Typography>

      <Stack spacing={1}>
        <IncrementerButton
          name="quantity"
          quantity={values.quantity}
          disabledDecrease={values.quantity <= 1}
          disabledIncrease={values.quantity >= available}
          onIncrease={() => setValue('quantity', values.quantity + 1)}
          onDecrease={() => setValue('quantity', values.quantity - 1)}
        />

        <Typography variant="caption" component="div" sx={{ textAlign: 'right' }}>
          Available: {available}
        </Typography>
      </Stack>
    </Stack>
  );

  const selectedCartKey = getCartItemKey({ id, variantId: selectedVariant?.id });
  const existingCartItem = cart.find((item) => item.key === selectedCartKey);
  const isMaxQuantity = existingCartItem ? existingCartItem.quantity >= available : false;

  const renderActions = (
    <Stack direction="row" spacing={2}>
      <Button
        fullWidth
        disabled={isMaxQuantity || disabledActions || !variantInStock || available < 1}
        size="large"
        color="warning"
        variant="contained"
        startIcon={<Iconify icon="solar:cart-plus-bold" width={24} />}
        onClick={handleAddCart}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {!variantInStock || available < 1 ? 'Out of Stock' : 'Add to Cart'}
      </Button>

      <Button
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        disabled={disabledActions || !variantInStock || available < 1}
      >
        Buy Now
      </Button>
    </Stack>
  );

  const renderSubDescription = (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {subDescription}
    </Typography>
  );

  const renderRating = (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        color: 'text.disabled',
        typography: 'body2',
      }}
    >
      <Rating size="small" value={totalRatings} precision={0.1} readOnly sx={{ mr: 1 }} />
      {`(${fShortenNumber(totalReviews)} reviews)`}
    </Stack>
  );

  const renderLabels = (newLabel.enabled || saleLabel.enabled) && (
    <Stack direction="row" alignItems="center" spacing={1}>
      {newLabel.enabled && <Label color="info">{newLabel.content}</Label>}
      {saleLabel.enabled && <Label color="error">{saleLabel.content}</Label>}
    </Stack>
  );

  const renderInventoryType = (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        component="span"
        sx={{
          typography: 'overline',
          color:
            (inventoryType === 'out of stock' && 'error.main') ||
            (inventoryType === 'low stock' && 'warning.main') ||
            'success.main',
        }}
      >
        {inventoryType}
      </Box>
      {variantSKU && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          SKU: {variantSKU}
        </Typography>
      )}
    </Stack>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} sx={{ pt: 3 }} {...other}>
        <Stack spacing={2} alignItems="flex-start">
          {renderLabels}

          {renderInventoryType}

          <Typography variant="h5">{name}</Typography>

          {renderRating}

          {renderPrice}

          {renderSubDescription}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />
        {renderSizeOptions}
        {renderColorOptions}

        {renderQuantity}

        <Divider sx={{ borderStyle: 'dashed' }} />

        {renderActions}

        {renderShare}
      </Stack>
    </FormProvider>
  );
}

ProductDetailsSummary.propTypes = {
  cart: PropTypes.array,
  disabledActions: PropTypes.bool,
  onAddCart: PropTypes.func,
  onBuyNow: PropTypes.func,
  onGotoStep: PropTypes.func,
  onVariantChange: PropTypes.func,
  product: PropTypes.object,
};
