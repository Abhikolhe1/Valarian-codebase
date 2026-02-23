import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
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
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// utils
import { fCurrency, fShortenNumber } from 'src/utils/format-number';
// components
import { ColorPicker } from 'src/components/color-utils';
import FormProvider, { RHFSelect } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
//
import IncrementerButton from './common/incrementer-button';

// ----------------------------------------------------------------------

export default function ProductDetailsSummary({
  cart,
  product,
  onAddCart,
  onGotoStep,
  disabledActions,
  onVariantChange,
  ...other
}) {
  const router = useRouter();

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
    isBestSeller,
    description,
    shortDescription,
    variants,
  } = product;

  // State for selected variant
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Set default variant on component mount
  useEffect(() => {
    if (variants && variants.length > 0) {
      const defaultVariant = variants.find(v => v.isDefault) || variants[0];
      setSelectedVariant(defaultVariant);
      if (onVariantChange) {
        onVariantChange(defaultVariant);
      }
    }
  }, [variants, onVariantChange]);

  // Get variant-specific values or fallback to product values
  const currentPrice = selectedVariant?.price || (salePrice && salePrice < price ? salePrice : price);
  const available = selectedVariant?.stockQuantity ?? stockQuantity ?? 0;
  const variantInStock = selectedVariant?.inStock ?? inStock;
  const variantSKU = selectedVariant?.sku;

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

  const existProduct = cart.map((item) => item.id).includes(id);

  const isMaxQuantity =
    cart.filter((item) => item.id === id).map((item) => item.quantity)[0] >= available;

  // Get available colors and sizes from variants
  const availableColors = variants && variants.length > 0
    ? [...new Set(variants.map(v => v.color))]
    : (colors || []);

  const availableSizes = variants && variants.length > 0
    ? [...new Set(variants.map(v => v.size))]
    : (sizes || []);

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
  const handleColorChange = useCallback((color) => {
    if (variants && variants.length > 0) {
      const variant = variants.find(v =>
        v.color === color && v.size === values.size
      );
      if (variant) {
        setSelectedVariant(variant);
        setValue('colors', color);
        setValue('variantId', variant.id);
        setValue('price', variant.price || currentPrice);
        setValue('available', variant.stockQuantity);
        setValue('quantity', variant.stockQuantity < 1 ? 0 : Math.min(values.quantity, variant.stockQuantity));
        if (onVariantChange) {
          onVariantChange(variant);
        }
      }
    } else {
      setValue('colors', color);
    }
  }, [variants, values.size, values.quantity, setValue, currentPrice, onVariantChange]);

  // Handle size change - find matching variant
  const handleSizeChange = useCallback((size) => {
    if (variants && variants.length > 0) {
      const variant = variants.find(v =>
        v.color === values.colors && v.size === size
      );
      if (variant) {
        setSelectedVariant(variant);
        setValue('size', size);
        setValue('variantId', variant.id);
        setValue('price', variant.price || currentPrice);
        setValue('available', variant.stockQuantity);
        setValue('quantity', variant.stockQuantity < 1 ? 0 : Math.min(values.quantity, variant.stockQuantity));
        if (onVariantChange) {
          onVariantChange(variant);
        }
      }
    } else {
      setValue('size', size);
    }
  }, [variants, values.colors, values.quantity, setValue, currentPrice, onVariantChange]);

  // Check if a color/size combination is available
  const isColorAvailable = useCallback((color) => {
    if (!variants || variants.length === 0) return true;
    return variants.some(v => v.color === color && v.inStock);
  }, [variants]);

  const isSizeAvailable = useCallback((size) => {
    if (!variants || variants.length === 0) return true;
    return variants.some(v => v.size === size && v.color === values.colors && v.inStock);
  }, [variants, values.colors]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (!existProduct) {
        onAddCart({
          ...data,
          colors: [values.colors],
          subTotal: data.price * data.quantity,
          variantId: selectedVariant?.id,
        });
      }
      onGotoStep(0);
      router.push(paths.product.checkout);
    } catch (error) {
      console.error(error);
    }
  });

  const handleAddCart = useCallback(() => {
    try {
      onAddCart({
        ...values,
        colors: [values.colors],
        subTotal: values.price * values.quantity,
        variantId: selectedVariant?.id,
      });
    } catch (error) {
      console.error(error);
    }
  }, [onAddCart, values, selectedVariant]);

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

      <Link
        variant="subtitle2"
        sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center' }}
      >
        <Iconify icon="solar:heart-bold" width={16} sx={{ mr: 1 }} />
        Favorite
      </Link>

      <Link
        variant="subtitle2"
        sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center' }}
      >
        <Iconify icon="solar:share-bold" width={16} sx={{ mr: 1 }} />
        Share
      </Link>
    </Stack>
  );

  const renderColorOptions = availableColors && availableColors.length > 0 && (
    <Stack direction="row">
      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
        Color
      </Typography>

      <Controller
        name="colors"
        control={control}
        render={({ field }) => (
          <ColorPicker
            colors={availableColors}
            selected={field.value}
            onSelectColor={(color) => {
              field.onChange(color);
              handleColorChange(color);
            }}
            limit={4}
            sx={{
              '& .MuiButtonBase-root': {
                opacity: (theme) => {
                  const color = theme.palette.mode === 'light' ? field.value : field.value;
                  return isColorAvailable(color) ? 1 : 0.3;
                },
              },
            }}
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
          <MenuItem key={size} value={size} disabled={!isSizeAvailable(size)}>
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

        {renderColorOptions}

        {renderSizeOptions}

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
  onGotoStep: PropTypes.func,
  onVariantChange: PropTypes.func,
  product: PropTypes.object,
};
