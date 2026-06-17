import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import Iconify from 'src/components/iconify';
import Lightbox, { useLightBox } from 'src/components/lightbox';
import { useGetProduct } from 'src/api/product';
import { useRouter } from 'src/routes/hook';
import { fCurrency } from 'src/utils/format-number';
import { resolvePremiumActionPath } from 'src/utils/premium-preorder';

const DEFAULT_CONTENT = {
  eyebrow: 'The Product',
  heading: 'See Every Detail',
  description:
    'Explore the premium piece up close before you preorder. Multiple campaign and product images are pulled from the selected product.',
  productSlug: '',
  preorderButtonText: 'Preorder Now',
  preorderButtonLink: '/premium',
  backgroundColor: '#f7f1ea',
  accentColor: '#8C6549',
  textColor: '#1f1f1f',
  secondaryTextColor: '#6b6b6b',
};

const dedupeImages = (images = []) => [...new Set(images.filter(Boolean))];
const MOBILE_VISIBLE_THUMBNAILS = 3;
const DESKTOP_VISIBLE_THUMBNAILS = 3;

export default function PremiumProductShowcaseSection({ section }) {
  const router = useRouter();
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };
  const { product } = useGetProduct(content.productSlug);
  const images = useMemo(() => {
    const productImages = [
      product?.coverImage,
      ...(Array.isArray(product?.images) ? product.images : []),
    ];

    return dedupeImages(productImages);
  }, [product]);
  const [selectedImage, setSelectedImage] = useState('');
  const slides = useMemo(
    () =>
      images.map((image) => ({
        src: image,
        alt: product?.name || content.heading,
        title: product?.name || content.heading,
      })),
    [content.heading, images, product?.name]
  );
  const lightbox = useLightBox(slides);

  useEffect(() => {
    setSelectedImage(images[0] || '');
  }, [images]);

  const activeImage = selectedImage || images[0] || '';
  const activeImageIndex = Math.max(
    0,
    images.findIndex((image) => image === activeImage)
  );
  const currentPrice = Number(product?.salePrice || product?.price || 0);
  const originalPrice = Number(product?.price || currentPrice || 0);
  const mobileRemainingCount = Math.max(0, images.length - MOBILE_VISIBLE_THUMBNAILS);
  const desktopRemainingCount = Math.max(0, images.length - DESKTOP_VISIBLE_THUMBNAILS);
  const scrollRef = useRef(null);
  const showThumbnailScrollButtons = images.length > DESKTOP_VISIBLE_THUMBNAILS;

  const scrollThumbnails = (direction) => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollBy({
      left: direction === 'left' ? -container.clientWidth : container.clientWidth,
      behavior: 'smooth',
    });
  };

  const handlePreorder = () => {
    const nextPath = resolvePremiumActionPath({
      productSlug: content.productSlug,
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
        py: { xs: 8, md: 12 },
        background: `linear-gradient(180deg, ${content.backgroundColor} 0%, ${alpha(content.backgroundColor, 0.92)} 100%)`,
      }}
    >
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 4, md: 6 }} alignItems="stretch">
          <Stack sx={{ flex: 1.1 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "#fff",
                boxShadow: '0 18px 45px rgba(18, 18, 18, 0.08)',
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => {
                  if (!activeImage) {
                    return;
                  }

                  lightbox.setSelected(activeImageIndex);
                  lightbox.onOpen(activeImage);
                }}
                sx={{
                  width: '100%',
                  height: { xs: 320, md: 520 },
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  bgcolor: `${content.backgroundColor}`,
                  p: 0,
                  border: 0,
                  cursor: activeImage ? 'zoom-in' : 'default',
                }}
              >
                {activeImage ? (
                  <Box
                    component="img"
                    src={activeImage}
                    alt={product?.name || content.heading}
                    sx={{ width: 1, height: 1, objectFit: 'contain' }}
                  />
                //   <Box
                //   sx={{
                //     width: '100%',
                //     aspectRatio: '1 / 1',
                //     overflow: 'hidden',
                //     borderRadius: 2.5,
                //     display: 'flex',
                //     alignItems: 'center',
                //     justifyContent: 'center',
                //     bgcolor: '#f7f1ea', // optional soft bg
                //   }}
                // >
                //   <Box
                //     component="img"
                //     src={activeImage}
                //     alt={product?.name || content.heading}
                //     sx={{
                //       width: '100%',
                //       height: '100%',
                //       objectFit: 'cover',
                //     }}
                //   />
                // </Box>
                ) : (
                  <Box sx={{ width: 1, height: 1, display: 'grid', placeItems: 'center', color: 'text.disabled' }}>
                    No product image available
                  </Box>
                )}
              </Box>

              {images.length > 1 && (
                <Box
                  sx={{
                    mt: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  {showThumbnailScrollButtons && (
                    <IconButton
                      onClick={() => scrollThumbnails('left')}
                      sx={{
                        display: { xs: 'none', md: 'inline-flex' },
                        flexShrink: 0,
                        border: `1px solid ${alpha(content.accentColor, 0.2)}`,
                        color: content.accentColor,
                        bgcolor: alpha('#ffffff', 0.86),
                      }}
                    >
                      <Iconify icon="carbon:chevron-left" width={20} />
                    </IconButton>
                  )}

                  <Box
                    ref={scrollRef}
                    sx={{
                      display: 'flex',
                      justifyContent: {
                        xs: images.length <= MOBILE_VISIBLE_THUMBNAILS ? 'center' : 'flex-start',
                        md: images.length <= DESKTOP_VISIBLE_THUMBNAILS ? 'center' : 'flex-start',
                      },
                      gap: 1.25,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      flexWrap: 'nowrap',
                      px: 0.5,
                      scrollSnapType: 'x proximity',
                      scrollPaddingInline: 8,
                      flex: 1,
                      maxWidth: { xs: '100%', md: '70%' },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      '&::-webkit-scrollbar': {
                        display: 'none',
                      },
                    }}
                  >
                  {images.map((image, index) => {
                    const isActive = image === activeImage;
                    const showMobileRemaining =
                      index === MOBILE_VISIBLE_THUMBNAILS - 1 && mobileRemainingCount > 0;
                    const showDesktopRemaining =
                      index === DESKTOP_VISIBLE_THUMBNAILS - 1 && desktopRemainingCount > 0;

                    return (
                      <Box
                        key={image}
                        component="button"
                        type="button"
                        onClick={() => {
                          setSelectedImage(image);
                          // lightbox.setSelected(images.findIndex((item) => item === image));
                        }}
                        sx={{
                          position: 'relative',
                          p: 0,
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: isActive ? `2px solid ${content.accentColor}` : '1px solid rgba(145, 158, 171, 0.24)',
                          boxShadow: isActive ? `0 0 0 3px ${alpha(content.accentColor, 0.16)}` : 'none',
                          height: 88,
                          minWidth: {
                            xs: 'calc((100% - 20px) / 3)',
                            md: 'calc((100% - 20px) / 3)',
                          },
                          maxWidth: {
                            xs: 'calc((100% - 20px) / 3)',
                            md: 'calc((100% - 40px) / 3)',
                          },
                          flex: '0 0 auto',
                          scrollSnapAlign: 'start',
                          bgcolor:  `${content.backgroundColor}`,
                        }}
                      >
                        <Box component="img" src={image} alt={product?.name || 'Premium product'} sx={{ width: 1, height: 1, objectFit: 'contain' }} />
                        {/* {showMobileRemaining && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: { xs: 'flex', md: 'none' },
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'rgba(17, 17, 17, 0.45)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '1rem',
                              backdropFilter: 'blur(1.5px)',
                            }}
                          >
                            +{mobileRemainingCount}
                          </Box>
                        )} */}
                        {/* {showDesktopRemaining && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: { xs: 'none', md: 'flex' },
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'rgba(17, 17, 17, 0.45)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '1rem',
                              backdropFilter: 'blur(1.5px)',
                            }}
                          >
                            +{desktopRemainingCount}
                          </Box>
                        )} */}
                      </Box>
                    );
                  })}
                  </Box>

                  {showThumbnailScrollButtons && (
                    <IconButton
                      onClick={() => scrollThumbnails('right')}
                      sx={{
                        display: { xs: 'none', md: 'inline-flex' },
                        flexShrink: 0,
                        border: `1px solid ${alpha(content.accentColor, 0.2)}`,
                        color: content.accentColor,
                        bgcolor: alpha('#ffffff', 0.86),
                      }}
                    >
                      <Iconify icon="carbon:chevron-right" width={20} />
                    </IconButton>
                  )}
                </Box>
              )}
            </Box>
          </Stack>

          <Stack spacing={2.5} sx={{ flex: 0.9, justifyContent: 'center' }}>
            <Chip
              label={content.eyebrow}
              sx={{
                alignSelf: 'flex-start',
                bgcolor: alpha(content.accentColor, 0.12),
                color: content.accentColor,
                fontWeight: 700,
              }}
            />

            <Typography
              sx={{
                fontFamily: '"Cormorant Garamond", "Georgia", serif',
                fontSize: { xs: '2.4rem', md: '4rem' },
                lineHeight: 1,
                color: content.textColor,
              }}
            >
              {content.heading}
            </Typography>

            <Typography sx={{ color: content.secondaryTextColor, maxWidth: 560 }}>
              {content.description}
            </Typography>

            <Stack spacing={1}>
              <Typography variant="overline" sx={{ color: content.accentColor }}>
                {product?.name || 'Select a product slug in CMS'}
              </Typography>
              {currentPrice > 0 && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="h4" sx={{ color: content.textColor }}>
                    {fCurrency(currentPrice)}
                  </Typography>
                  {originalPrice > currentPrice && (
                    <Typography sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
                      {fCurrency(originalPrice)}
                    </Typography>
                  )}
                </Stack>
              )}
              <Typography sx={{ color: content.secondaryTextColor }}>
                {product?.shortDescription || product?.description || 'The selected product details will appear here.'}
              </Typography>
            </Stack>

            <Button
              variant="contained"
              color="secondary"
              onClick={handlePreorder}
              sx={{ alignSelf: 'flex-start', px: 4, py: 1.5 }}
            >
              {content.preorderButtonText}
            </Button>
          </Stack>
        </Stack>

        <Lightbox
          index={lightbox.selected}
          slides={slides}
          open={lightbox.open}
          close={lightbox.onClose}
          onGetCurrentIndex={(index) => lightbox.setSelected(index)}
        />
      </Container>
    </Box>
  );
}

PremiumProductShowcaseSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
