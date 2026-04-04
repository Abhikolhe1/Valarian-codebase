import { AnimatePresence, m, useScroll, useSpring, useTransform } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

const HOLD_PORTION = 0.62;
const FINAL_CARD_HOLD_PORTION = 0.16;

const PRODUCTS = [
  {
    id: 1,
    title: 'Premium Classic T-Shirt',
    description:
      'Crafted with premium cotton for ultimate comfort and style. Perfect for everyday wear with a polished finish.',
    image: '/assets/images/home/scroll-animation/tshirt1-removebg-preview.png',
    buttonText: 'Shop Now',
    buttonLink: paths.product.root,
    accent: '#D97706',
    imageFit: 'contain',
  },
  {
    id: 2,
    title: 'Essential Comfort Fit',
    description:
      'Experience the perfect blend of comfort and durability. Made to last, designed to impress from every angle.',
    image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
    buttonText: 'Explore',
    buttonLink: paths.product.root,
    accent: '#B91C1C',
    imageFit: 'contain',
  },
  {
    id: 3,
    title: 'Modern Fit Premium',
    description:
      'Contemporary design meets classic elegance. Elevate your wardrobe with a silhouette made for all-day confidence.',
    image: '/assets/images/home/scroll-animation/tshirt3-removebg-preview.png',
    buttonText: 'Discover',
    buttonLink: paths.product.root,
    accent: '#0F766E',
    imageFit: 'contain',
  },
  {
    id: 4,
    title: 'Signature Collection',
    description:
      'Our signature piece defines quality and style with premium texture, clean finishing, and a timeless visual identity.',
    image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
    buttonText: 'View Collection',
    buttonLink: paths.product.root,
    accent: '#1D4ED8',
    imageFit: 'contain',
  },
];

function mapProgressToIndex(progress, itemCount) {
  if (itemCount <= 1) {
    return 0;
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  if (clampedProgress >= 1 - FINAL_CARD_HOLD_PORTION) {
    return itemCount - 1;
  }

  const adjustedProgress = clampedProgress / (1 - FINAL_CARD_HOLD_PORTION);
  const segments = itemCount - 1;
  const scaled = adjustedProgress * segments;
  const segmentIndex = Math.min(Math.floor(scaled), segments - 1);
  const segmentProgress = scaled - segmentIndex;

  if (segmentProgress <= HOLD_PORTION) {
    return segmentIndex;
  }

  const transitionProgress = (segmentProgress - HOLD_PORTION) / (1 - HOLD_PORTION);
  return segmentIndex + transitionProgress;
}

function normalizeProducts(products) {
  return products.map((product, index) => ({
    id: product.id ?? index + 1,
    title: product.title,
    description: product.description,
    image: product.image,
    buttonText: product.buttonText || 'Explore',
    buttonLink: product.buttonLink || paths.product.root,
    accent: product.accent || PRODUCTS[index % PRODUCTS.length].accent,
    imageFit: product.imageFit || 'contain',
    eyebrow: product.eyebrow || `Story ${String(index + 1).padStart(2, '0')}`,
  }));
}

// ----------------------------------------------------------------------

export default function HomeScrollAnimated({ products: propProducts, cmsData, ...other }) {
  const theme = useTheme();
  const wrapperRef = useRef(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  const rawProducts = cmsData?.content?.products || propProducts || PRODUCTS;
  const products = useMemo(() => normalizeProducts(rawProducts), [rawProducts]);
  const productCount = products.length;
  const backgroundColor = cmsData?.settings?.backgroundColor || theme.palette.background.default;

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  const mappedIndex = useTransform(scrollYProgress, (value) =>
    mapProgressToIndex(value, productCount)
  );
  const smoothIndex = useSpring(mappedIndex, {
    stiffness: 90,
    damping: 24,
    mass: 0.8,
    restDelta: 0.001,
  });

  useEffect(() => {
    const unsubscribe = smoothIndex.on('change', (latest) => {
      const nextIndex = Math.max(0, Math.min(productCount - 1, Math.round(latest)));
      setCurrentProductIndex((current) => (current === nextIndex ? current : nextIndex));
    });

    return () => unsubscribe();
  }, [productCount, smoothIndex]);

  const currentProduct = products[currentProductIndex] || products[0];

  if (!currentProduct) {
    return null;
  }

  return (
    <Box
      ref={wrapperRef}
      {...other}
      sx={{
        position: 'relative',
        height: {
          xs: `${productCount * 110 + 35}vh`,
          md: `${productCount * 135 + 30}vh`,
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          bgcolor: backgroundColor,
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: { xs: 0, sm: 5, md: 10 },
            minHeight: { xs: '100vh', md: 'auto' },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.92fr) minmax(0, 1.08fr)' },
              gridTemplateRows: { xs: '60vh 40vh', sm: 'auto', md: 'auto' },
              alignItems: { xs: 'stretch', md: 'center' },
              gap: { xs: 0, sm: 4, md: 8 },
              width: '100%',
              minHeight: { xs: '100vh', md: 'auto' },
            }}
          >
            <Box
              sx={{
                order: { xs: 2, md: 1 },
                display: 'flex',
                alignItems: { xs: 'stretch', md: 'center' },
                minHeight: { xs: '40vh', sm: 'auto' },
              }}
            >
              <Stack
                spacing={{ xs: 1.75, sm: 2.25, md: 3.5 }}
                sx={{
                  maxWidth: 560,
                  width: '100%',
                  minHeight: { xs: '40vh', sm: 'auto' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  py: { xs: 2.5, sm: 0 },
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: { xs: '0.16em', md: '0.24em' },
                      color: currentProduct.accent,
                      fontWeight: 700,
                      fontSize: { xs: '0.65rem', sm: '0.72rem', md: '0.75rem' },
                    }}
                  >
                    {currentProduct.eyebrow}
                  </Typography>

                  <Box
                    sx={{
                      width: 56,
                      height: 1,
                      bgcolor: alpha(currentProduct.accent, 0.4),
                    }}
                  />
                </Stack>

                <AnimatePresence mode="wait">
                  <m.div
                    key={currentProduct.id}
                    initial={{ opacity: 0, x: -32 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Stack
                      spacing={{ xs: 1.5, sm: 3 }}
                      sx={{
                        minHeight: { xs: '100%', sm: 'auto' },
                        justifyContent: { xs: 'space-between', sm: 'flex-start' },
                      }}
                    >
                      <Typography
                        variant="h1"
                        sx={{
                          fontSize: { xs: '1.9rem', sm: '2.5rem', md: '4.35rem' },
                          lineHeight: { xs: 1.05, md: 1 },
                          letterSpacing: '-0.04em',
                          fontWeight: 700,
                          color: 'grey.900',
                        }}
                      >
                        {currentProduct.title}
                      </Typography>

                      <Typography
                        variant="h6"
                        sx={{
                          maxWidth: 500,
                          color: 'text.secondary',
                          fontWeight: 400,
                          lineHeight: { xs: 1.55, md: 1.7 },
                          fontSize: { xs: '0.95rem', sm: '1rem', md: '1.25rem' },
                          maxHeight: {
                            xs: 'calc(0.95rem * 1.55 * 3)',
                            sm: 'calc(1rem * 1.55 * 3)',
                            md: 'calc(1.25rem * 1.7 * 3)',
                          },
                          overflowY: 'auto',
                          pr: 0.5,
                        }}
                      >
                        {currentProduct.description}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1.25}
                        sx={{ pt: { xs: 0.5, md: 1 }, flexWrap: 'wrap' }}
                      >
                        <Button
                          component={RouterLink}
                          href={currentProduct.buttonLink}
                          variant="contained"
                          size="medium"
                          sx={{
                            minWidth: { xs: 140, sm: 160, md: 180 },
                            px: { xs: 2.25, md: 3 },
                            py: { xs: 1, md: 1.2 },
                            fontSize: { xs: '0.95rem', md: '1rem' },
                            bgcolor: currentProduct.accent,
                            '&:hover': {
                              bgcolor: currentProduct.accent,
                              filter: 'brightness(0.94)',
                            },
                          }}
                        >
                          {currentProduct.buttonText}
                        </Button>
                      </Stack>
                    </Stack>
                  </m.div>
                </AnimatePresence>

                <Stack direction="row" spacing={1.25} sx={{ pt: 1 }}>
                  {products.map((product, index) => (
                    <Box
                      key={product.id || `${product.title}-${index}`}
                      sx={{
                        width: index === currentProductIndex ? 48 : 16,
                        height: 6,
                        borderRadius: 999,
                        bgcolor:
                          index === currentProductIndex
                            ? currentProduct.accent
                            : alpha(theme.palette.grey[900], 0.12),
                        transition: 'all 320ms ease',
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                order: { xs: 1, md: 2 },
                position: 'relative',
                minHeight: { xs: '60vh', sm: 300, md: 620 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '@media (min-width:400px) and (max-width:599.95px)': {
                  minHeight: '60vh',
                },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: { xs: '8% 0 0 0', md: '10% 4% 8% 10%' },
                  borderRadius: { xs: 8, md: 10 },
                  background: 'transparent',
                }}
              />

              <AnimatePresence mode="wait">
                <m.div
                  key={`${currentProduct.id}-image`}
                  initial={{ opacity: 0, x: 42, scale: 0.94, rotate: -2 }}
                  animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, x: -18, scale: 0.96, rotate: 1.5 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: '100%' }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      minHeight: { xs: '60vh', sm: 400, md: 620 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pt: { xs: 2, sm: 0 },
                      '@media (min-width:400px) and (max-width:599.95px)': {
                        minHeight: '60vh',
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={currentProduct.image}
                      alt={currentProduct.title}
                      sx={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: { xs: '48vh', sm: '38vh', md: '72vh' },
                        display: 'block',
                        objectFit: currentProduct.imageFit,
                        objectPosition: 'center',
                        '@media (min-width:400px) and (max-width:599.95px)': {
                          maxHeight: '52vh',
                        },
                      }}
                    />
                  </Box>
                </m.div>
              </AnimatePresence>

              <Box
                sx={{
                  position: 'absolute',
                  right: { xs: 4, sm: 12, md: -18 },
                  bottom: { xs: 12, sm: 12, md: 20 },
                  px: { xs: 1.5, md: 2.25 },
                  py: { xs: 0.75, md: 1.25 },
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.common.white, 0.84),
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 12px 30px ${alpha(theme.palette.grey[900], 0.08)}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'grey.900' }}>
                  {String(currentProductIndex + 1).padStart(2, '0')} /{' '}
                  {String(productCount).padStart(2, '0')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

HomeScrollAnimated.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      buttonText: PropTypes.string,
      buttonLink: PropTypes.string,
      accent: PropTypes.string,
      imageFit: PropTypes.string,
      eyebrow: PropTypes.string,
    })
  ),
  cmsData: PropTypes.shape({
    content: PropTypes.shape({
      products: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          image: PropTypes.string.isRequired,
          buttonText: PropTypes.string,
          buttonLink: PropTypes.string,
          accent: PropTypes.string,
          imageFit: PropTypes.string,
          eyebrow: PropTypes.string,
        })
      ),
    }),
    settings: PropTypes.shape({
      backgroundColor: PropTypes.string,
    }),
  }),
};
