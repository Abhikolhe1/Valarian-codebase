import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useGetProduct } from 'src/api/product';
import { useRouter } from 'src/routes/hook';
import { resolvePremiumActionPath } from 'src/utils/premium-preorder';
import {
  getDefaultPremiumVariant,
  getPremiumProductVariants,
  getPremiumVariantColorValue,
  getPremiumVariantColorOptions,
  getPremiumVariantPrice,
  getPremiumVariantSizeOptions,
  getPremiumNextAvailableVariant,
  isPremiumColorAvailable,
  isPremiumSizeAvailable,
  isPremiumVariantInStock,
} from 'src/utils/premium-product';

// ----------------------------------------------------------------------

const DEFAULT_CONTENT = {
  editionTitle: 'Signature Edition',
  soldCount: 240,
  totalCount: 400,
  sizes: ['S', 'M', 'L', 'XL'],
  selectedSize: 'M',
  preorderButtonText: 'Preorder',
  preorderButtonLink: '/premium/preorder',
  preorderProductSlug: '',
  preorderVariantId: '',
  headingPrimary: 'Time is Luxury',
  headingSecondary: "Don't waste it.",
  description:
    'The allocation window is closing. Once the timer reaches zero, this edition will never be produced again.',
  countdownTitle: 'Drop Closes In',
  countdownEndDate: '2026-12-31T23:59:59+05:30',
  timezone: 'Asia/Kolkata',
  sectionBg: '#f5f5f0',
  headingColor: '#a89479',
  descriptionColor: '#666666',
  progressLineColor: '#7a4100',
  buttonBg: '#7a5c45',
  buttonText: '#ffffff',
  buttonHoverBg: '#5f4634',
  countdownCardBg: '#ffffff',
  countdownCardBorder: '#e0e0e0',
  countdownNumberColor: '#2c2c2c',
  countdownLabelColor: '#666666',
};

function getRemainingTime(endDate) {
  const targetTime = new Date(endDate).getTime();
  const now = Date.now();

  if (!Number.isFinite(targetTime) || targetTime <= now) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diff = targetTime - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
}

function formatTime(value) {
  return String(value).padStart(2, '0');
}

export default function PremiumCountdownSection({ section }) {
  const router = useRouter();
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };
  const preorderProductSlug = String(content.preorderProductSlug || '').trim();
  const { product } = useGetProduct(preorderProductSlug);
  const variants = useMemo(() => getPremiumProductVariants(product), [product]);
  const colorOptions = useMemo(() => getPremiumVariantColorOptions(product), [product]);
  const productSizes = useMemo(() => getPremiumVariantSizeOptions(product), [product]);
  const fallbackSizes = useMemo(() => {
    if (Array.isArray(content.sizes) && content.sizes.length > 0) {
      return content.sizes;
    }

    return ['M'];
  }, [content.sizes]);
  const sizes = useMemo(() => {
    const mergedSizes = [...fallbackSizes, ...productSizes]
      .map((size) => String(size || '').trim())
      .filter(Boolean);
    const uniqueSizes = [...new Set(mergedSizes)];

    return uniqueSizes.length > 0 ? uniqueSizes : ['M'];
  }, [fallbackSizes, productSizes]);
  const [selectedSize, setSelectedSize] = useState(content.selectedSize || sizes[0]);
  const [selectedColor, setSelectedColor] = useState('');
  const [timeLeft, setTimeLeft] = useState(() => getRemainingTime(content.countdownEndDate));

  useEffect(() => {
    const defaultVariant = getDefaultPremiumVariant(product, content.preorderVariantId);

    if (defaultVariant) {
      setSelectedSize(defaultVariant.size || content.selectedSize || sizes[0]);
      setSelectedColor(getPremiumVariantColorValue(defaultVariant));
      return;
    }

    setSelectedSize(content.selectedSize || sizes[0]);
    setSelectedColor(colorOptions[0]?.value || '');
  }, [colorOptions, content.preorderVariantId, content.selectedSize, product, sizes]);

  useEffect(() => {
    setTimeLeft(getRemainingTime(content.countdownEndDate));

    const timer = setInterval(() => {
      setTimeLeft(getRemainingTime(content.countdownEndDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [content.countdownEndDate]);

  const progressPercent = useMemo(() => {
    const sold = Number(content.soldCount) || 0;
    const total = Number(content.totalCount) || 0;
    if (total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (sold / total) * 100));
  }, [content.soldCount, content.totalCount]);

  const resolvedVariantId = useMemo(() => {
    if (content.preorderVariantId) {
      return content.preorderVariantId;
    }

    const preferredVariant = getPremiumNextAvailableVariant(product, {
      color: selectedColor,
      size: selectedSize,
    });

    return preferredVariant?.id || '';
  }, [content.preorderVariantId, product, selectedColor, selectedSize]);

  const resolvedVariant = useMemo(
    () => variants.find((variant) => variant.id === resolvedVariantId) || null,
    [resolvedVariantId, variants]
  );
  const resolvedPrice = useMemo(
    () => getPremiumVariantPrice(product, resolvedVariant),
    [product, resolvedVariant]
  );
  const selectedVariantInStock = isPremiumVariantInStock(product, resolvedVariant);
  const sizeAvailability = useMemo(
    () =>
      sizes.map((size) => ({
        value: size,
        disabled: variants.length > 0 && !isPremiumSizeAvailable(product, size, selectedColor),
      })),
    [product, selectedColor, sizes, variants.length]
  );
  const colorAvailability = useMemo(
    () =>
      colorOptions.map((colorOption) => ({
        ...colorOption,
        disabled:
          variants.length > 0 &&
          !isPremiumColorAvailable(product, colorOption.value, selectedSize),
      })),
    [colorOptions, product, selectedSize, variants.length]
  );

  const handleSizeChange = (value) => {
    const nextVariant = getPremiumNextAvailableVariant(product, {
      color: selectedColor,
      size: value,
    });

    setSelectedSize(value);

    if (nextVariant) {
      setSelectedColor(getPremiumVariantColorValue(nextVariant));
    }
  };

  const handleColorChange = (value) => {
    const nextVariant = getPremiumNextAvailableVariant(product, {
      color: value,
      size: selectedSize,
    });

    setSelectedColor(value);

    if (nextVariant?.size) {
      setSelectedSize(nextVariant.size);
    }
  };

  const handlePreorder = () => {
    const nextPath = resolvePremiumActionPath({
      productSlug: preorderProductSlug,
      variantId: resolvedVariantId,
      fallbackPath: content.preorderButtonLink,
    });

    if (!nextPath) {
      return;
    }

    if (/^https?:\/\//i.test(nextPath)) {
      window.location.href = nextPath;
      return;
    }

    router.push(nextPath);
  };

  return (
    <Box
      sx={{
        backgroundColor: content.sectionBg,
        py: { xs: 8, md: 12 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ mb: { xs: 5, md: 8 } }}
        >
          <Box sx={{ width: { xs: '100%', md: '48%' } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {content.editionTitle}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: content.descriptionColor }}>
              {content.soldCount}/{content.totalCount}
            </Typography>

            <Box
              sx={{
                mt: 2,
                width: '100%',
                height: 6,
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  borderRadius: 999,
                  backgroundColor: content.progressLineColor,
                  transition: 'width 0.35s ease',
                }}
              />
            </Box>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            sx={{
              width: { xs: '100%', md: 'auto' },
              flexWrap: 'wrap',
              rowGap: 1.5,
            }}
          >
            {!!colorAvailability.length && (
              <Stack spacing={1} sx={{ minWidth: { xs: '100%', sm: 240 }, alignSelf: 'stretch' }}>
                <Typography
                  variant="caption"
                  sx={{ color: content.descriptionColor, fontWeight: 700, letterSpacing: 1 }}
                >
                  Color
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {colorAvailability.map(({ disabled, label, swatch, value }) => {
                    const contentNode = (
                      <Box
                        component="button"
                        type="button"
                        onClick={() => !disabled && handleColorChange(value)}
                        disabled={disabled}
                        sx={{
                          position: 'relative',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          border: '1px solid',
                          borderColor:
                            selectedColor === value ? 'secondary.main' : 'divider',
                          bgcolor:
                            selectedColor === value ? 'secondary.lighter' : 'background.paper',
                          borderRadius: 999,
                          px: 1.5,
                          py: 1,
                          minHeight: 42,
                          color: 'text.primary',
                          opacity: disabled ? 0.58 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          '&::after': disabled
                            ? {
                                content: '""',
                                position: 'absolute',
                                left: 10,
                                right: 10,
                                top: '50%',
                                borderTop: '2.5px solid',
                                borderColor: 'error.main',
                                transform: 'rotate(-24deg)',
                                zIndex: 2,
                              }
                            : undefined,
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: swatch || 'transparent',
                            border: '1px solid rgba(0,0,0,0.16)',
                          }}
                        />
                        <Box component="span">{label}</Box>
                      </Box>
                    );

                    return disabled ? (
                      <Tooltip key={value} title="Out of stock">
                        <Box>{contentNode}</Box>
                      </Tooltip>
                    ) : (
                      <Box key={value}>{contentNode}</Box>
                    );
                  })}
                </Stack>
              </Stack>
            )}

            <Stack spacing={1} sx={{ minWidth: { xs: '100%', sm: 260 }, alignSelf: 'stretch' }}>
              <Typography
                variant="caption"
                sx={{ color: content.descriptionColor, fontWeight: 700, letterSpacing: 1 }}
              >
                Size
              </Typography>
              <ToggleButtonGroup
                value={selectedSize}
                exclusive
                onChange={(event, value) => {
                  if (value) {
                    handleSizeChange(value);
                  }
                }}
                aria-label="size"
                sx={{
                  bgcolor: 'rgba(0,0,0,0.06)',
                  p: 0.5,
                  borderRadius: 999,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-start',
                  minHeight: 54,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '999px !important',
                    px: 2,
                    minHeight: 42,
                    color: 'text.primary',
                  },
                }}
              >
                {sizeAvailability.map((sizeOption) => (
                  <ToggleButton
                    key={sizeOption.value}
                    value={sizeOption.value}
                    disabled={sizeOption.disabled}
                    sx={{
                      position: 'relative',
                      ...(sizeOption.disabled && {
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          left: 10,
                          right: 10,
                          top: '50%',
                          borderTop: '2.5px solid',
                          borderColor: 'error.main',
                          transform: 'rotate(-24deg)',
                          zIndex: 2,
                        },
                        color: 'text.disabled',
                        opacity: 0.72,
                      }),
                    }}
                  >
                    {sizeOption.value}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Button
              variant="contained"
              onClick={handlePreorder}
              disabled={variants.length > 0 && !selectedVariantInStock}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'flex-end' },
                px: 4,
                minHeight: 44,
                borderRadius: 999,
                backgroundColor: content.buttonBg,
                color: content.buttonText,
                '&:hover': {
                  backgroundColor: content.buttonHoverBg,
                },
              }}
            >
              {content.preorderButtonText}
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Typography
            sx={{
              fontSize: { xs: '2rem', md: '3.8rem' },
              fontWeight: 500,
              lineHeight: 1.1,
              color: content.headingColor,
            }}
          >
            {content.headingPrimary}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '2rem', md: '3.8rem' },
              fontWeight: 500,
              fontStyle: 'italic',
              lineHeight: 1.1,
              color: content.headingColor,
            }}
          >
            {content.headingSecondary}
          </Typography>
          <Typography sx={{ maxWidth: 760, color: content.descriptionColor }}>
            {content.description}
          </Typography>
          {resolvedPrice > 0 && (
            <Typography variant="h5" sx={{ color: content.headingColor }}>
              {resolvedPrice.toLocaleString('en-IN', { style: 'currency', currency: product?.currency || 'INR' })}
            </Typography>
          )}
          {variants.length > 0 && (
            <Typography variant="body2" sx={{ color: selectedVariantInStock ? 'success.main' : 'error.main' }}>
              {selectedVariantInStock ? 'Selected variant available' : 'Selected size/color is out of stock'}
            </Typography>
          )}
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Card
            sx={{
              width: '100%',
              maxWidth: 620,
              p: { xs: 2.5, md: 4 },
              borderRadius: 3,
              border: `1px solid ${content.countdownCardBorder}`,
              backgroundColor: content.countdownCardBg,
              boxShadow: '0 12px 35px rgba(0,0,0,0.06)',
            }}
          >
            <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {content.countdownTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: content.descriptionColor }}>
                Timezone: {content.timezone}
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: { xs: 1, sm: 2 },
              }}
            >
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Sec', value: timeLeft.seconds },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: 'rgba(0,0,0,0.03)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '1.5rem', sm: '2rem' },
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: content.countdownNumberColor,
                    }}
                  >
                    {formatTime(item.value)}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: '0.75rem',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color: content.countdownLabelColor,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}

PremiumCountdownSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      editionTitle: PropTypes.string,
      soldCount: PropTypes.number,
      totalCount: PropTypes.number,
      sizes: PropTypes.arrayOf(PropTypes.string),
      selectedSize: PropTypes.string,
      preorderButtonText: PropTypes.string,
      preorderButtonLink: PropTypes.string,
      headingPrimary: PropTypes.string,
      headingSecondary: PropTypes.string,
      description: PropTypes.string,
      countdownTitle: PropTypes.string,
      countdownEndDate: PropTypes.string,
      timezone: PropTypes.string,
      sectionBg: PropTypes.string,
      headingColor: PropTypes.string,
      descriptionColor: PropTypes.string,
      progressLineColor: PropTypes.string,
      buttonBg: PropTypes.string,
      buttonText: PropTypes.string,
      buttonHoverBg: PropTypes.string,
      countdownCardBg: PropTypes.string,
      countdownCardBorder: PropTypes.string,
      countdownNumberColor: PropTypes.string,
      countdownLabelColor: PropTypes.string,
    }),
  }).isRequired,
};
