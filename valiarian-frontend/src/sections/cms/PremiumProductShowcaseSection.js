import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
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

export default function PremiumProductShowcaseSection({ section }) {
  const router = useRouter();
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };
  const { product } = useGetProduct(content.productSlug);
  const images = useMemo(() => {
    const configuredImages = Array.isArray(content.images) ? content.images : [];
    const productImages = [
      product?.coverImage,
      ...(Array.isArray(product?.images) ? product.images : []),
      ...((product?.variants || []).flatMap((variant) => variant.images || [])),
    ];

    return dedupeImages(configuredImages.length > 0 ? configuredImages : productImages);
  }, [content.images, product]);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    setSelectedImage(images[0] || '');
  }, [images]);

  const activeImage = selectedImage || images[0] || '';
  const currentPrice = Number(product?.salePrice || product?.price || 0);
  const originalPrice = Number(product?.price || currentPrice || 0);

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
          <Box sx={{ flex: 1.1 }}>
            <Card
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#fff',
                boxShadow: '0 18px 45px rgba(18, 18, 18, 0.08)',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 320, md: 520 },
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                }}
              >
                {activeImage ? (
                  <Box
                    component="img"
                    src={activeImage}
                    alt={product?.name || content.heading}
                    sx={{ width: 1, height: 1, objectFit: 'cover' }}
                  />
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
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(5, minmax(0, 1fr))' },
                    gap: 1.25,
                  }}
                >
                  {images.map((image) => {
                    const isActive = image === activeImage;

                    return (
                      <Box
                        key={image}
                        component="button"
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        sx={{
                          p: 0,
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: isActive ? `2px solid ${content.accentColor}` : '1px solid rgba(145, 158, 171, 0.24)',
                          boxShadow: isActive ? `0 0 0 3px ${alpha(content.accentColor, 0.16)}` : 'none',
                          height: 88,
                          bgcolor: 'grey.100',
                        }}
                      >
                        <Box component="img" src={image} alt={product?.name || 'Premium product'} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Card>
          </Box>

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
      </Container>
    </Box>
  );
}

PremiumProductShowcaseSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
