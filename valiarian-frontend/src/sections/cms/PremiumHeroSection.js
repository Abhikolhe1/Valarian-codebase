import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Iconify from 'src/components/iconify';
import { useRouter } from 'src/routes/hook';
import { resolvePremiumActionPath } from 'src/utils/premium-preorder';

const DEFAULT_CONTENT = {
  badgeText: 'DROP LIVE NOW',
  eyebrow: 'Signature Edition',
  heading: 'Once in a Lifetime.',
  subheading:
    "Handcrafted in Portugal using the world's finest cotton. Only 150 pieces available.",
  primaryButtonText: 'Explore Details',
  primaryButtonLink: '/premium/preorder',
  preorderProductSlug: '',
  preorderVariantId: '',
  ctaButtons: [],
  backgroundImage:
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1600&q=80',
  overlayOpacity: 0.45,
};

export default function PremiumHeroSection({ section }) {
  const router = useRouter();
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };
  const ctaButtons = Array.isArray(content.ctaButtons) ? content.ctaButtons : [];

  const navigateToAction = (fallbackPath) => {
    const nextPath = resolvePremiumActionPath({
      productSlug: content.preorderProductSlug,
      variantId: content.preorderVariantId,
      fallbackPath,
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
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${content.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.06)',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, rgba(245,245,240,${
              Number(content.overlayOpacity) * 0.6
            }) 0%, rgba(245,245,240,${content.overlayOpacity}) 100%)`,
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 10, textAlign: 'center' }}>
        <Stack spacing={2.5} alignItems="center">
          <Chip
            icon={<Iconify icon="solar:bolt-bold" width={18} />}
            label={content.badgeText}
            sx={{
              bgcolor: 'rgba(255,255,255,0.92)',
              color: 'error.main',
              fontWeight: 700,
              px: 1,
            }}
          />

          <Typography
            sx={{
              fontFamily: '"Playfair Display", "Georgia", serif',
              fontSize: { xs: '1.75rem', md: '3rem' },
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#c17a3a',
            }}
          >
            {content.eyebrow}
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Cormorant Garamond", "Georgia", serif',
              fontSize: { xs: '3rem', md: '6rem' },
              fontStyle: 'italic',
              fontWeight: 600,
              lineHeight: 1.05,
              color: '#1a1a1a',
            }}
          >
            {content.heading}
          </Typography>

          <Typography sx={{ maxWidth: 720, color: '#4a4a4a', lineHeight: 1.8 }}>
            {content.subheading}
          </Typography>

          <Button
            variant="contained"
            onClick={() => navigateToAction(content.primaryButtonLink)}
            sx={{
              mt: 1,
              px: 5,
              py: 1.8,
              borderRadius: 1,
              bgcolor: 'secondary.main',
              '&:hover': { bgcolor: 'secondary.main' },
            }}
          >
            {content.primaryButtonText}
          </Button>

          {ctaButtons.length > 0 && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }}>
              {ctaButtons.map((button, index) => {
                let variant = 'contained';

                if (button.style === 'outline') {
                  variant = 'outlined';
                } else if (button.style === 'text') {
                  variant = 'text';
                }

                return (
                  <Button
                    key={`${button.text}-${index}`}
                    variant={variant}
                    color={button.style === 'secondary' ? 'inherit' : 'secondary'}
                    onClick={() => navigateToAction(button.url)}
                    sx={{
                      minWidth: 160,
                      ...(variant === 'outlined' && {
                        borderColor: 'rgba(0,0,0,0.24)',
                        color: '#1a1a1a',
                      }),
                      ...(variant === 'text' && {
                        color: '#1a1a1a',
                      }),
                    }}
                  >
                    {button.text}
                  </Button>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

PremiumHeroSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
