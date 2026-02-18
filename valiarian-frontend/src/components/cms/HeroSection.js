import { Box, Button, Container, Stack, Typography, alpha } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Hero Section Component
 * Displays a full-width hero banner with title, subtitle, and CTA
 */
export default function HeroSection({ section }) {
  const { content, settings } = section;

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: settings?.height === 'full' ? '100vh' : '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: content?.backgroundImage
          ? `url(${content.backgroundImage})`
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: settings?.textColor || '#ffffff',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: alpha(
            settings?.backgroundColor || '#000000',
            content?.overlayOpacity || 0.5
          ),
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack
          spacing={3}
          alignItems={settings?.alignment || 'center'}
          textAlign={settings?.alignment || 'center'}
        >
          {content?.subtitle && (
            <Typography
              variant="overline"
              sx={{
                color: 'inherit',
                opacity: 0.9,
                letterSpacing: 2,
              }}
            >
              {content.subtitle}
            </Typography>
          )}

          {content?.title && (
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 800,
                color: 'inherit',
              }}
            >
              {content.title}
            </Typography>
          )}

          {content?.description && (
            <Typography
              variant="h5"
              sx={{
                maxWidth: 600,
                color: 'inherit',
                opacity: 0.9,
              }}
            >
              {content.description}
            </Typography>
          )}

          {content?.ctaText && content?.ctaLink && (
            <Button
              variant="contained"
              size="large"
              href={content.ctaLink}
              sx={{
                mt: 2,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
              }}
            >
              {content.ctaText}
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

HeroSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
    settings: PropTypes.object,
  }).isRequired,
};
