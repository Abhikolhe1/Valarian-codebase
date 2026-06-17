import { m } from 'framer-motion';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
// components
import { MotionViewport, varFade } from 'src/components/animate';
import Iconify from 'src/components/iconify';
import Image from 'src/components/image';

// ----------------------------------------------------------------------

export default function HeroSection({ section }) {
  const { content, settings = {} } = section;
  const {
    backgroundImage,
    backgroundVideo,
    overlayOpacity = 0.5,
    heading,
    subheading,
    description,
    ctaButtons = [],
    alignment = 'center',
    height = 'full',
  } = content;

  const alignmentMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  const heightMap = {
    full: '100vh',
    auto: 'auto',
    custom: settings.customHeight || '600px',
  };
  const hasMediaBackground = backgroundImage || backgroundVideo;
  const stackMarginX = alignment === 'center' ? 'auto' : 0;
  let stackMarginLeft = 0;

  if (alignment === 'right' || alignment === 'center') {
    stackMarginLeft = 'auto';
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: heightMap[height],
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background Image */}
      {backgroundImage && !backgroundVideo && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -2,
          }}
        >
          <Image
            src={backgroundImage}
            alt={heading}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
      )}

      {/* Background Video */}
      {backgroundVideo && (
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -2,
          }}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </Box>
      )}

      {/* Overlay */}
      {(backgroundImage || backgroundVideo) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: (theme) => alpha(theme.palette.grey[900], overlayOpacity),
            zIndex: -1,
          }}
        />
      )}

      {/* Content */}
      <Container
        component={MotionViewport}
        sx={{
          py: { xs: 10, md: 15 },
          textAlign: alignment,
        }}
      >
        <Stack
          spacing={3}
          alignItems={alignmentMap[alignment]}
          sx={{
            maxWidth: 800,
            mx: stackMarginX,
            ml: stackMarginLeft,
          }}
        >
          {subheading && (
            <m.div variants={varFade().inUp}>
              <Typography
                component="div"
                variant="overline"
                sx={{
                  color: hasMediaBackground ? 'common.white' : 'text.disabled',
                }}
              >
                {subheading}
              </Typography>
            </m.div>
          )}

          <m.div variants={varFade().inDown}>
            <Typography
              variant="h1"
              sx={{
                color: hasMediaBackground ? 'common.white' : 'text.primary',
              }}
            >
              {heading}
            </Typography>
          </m.div>

          {description && (
            <m.div variants={varFade().inUp}>
              <Typography
                variant="h5"
                sx={{
                  color: hasMediaBackground ? 'grey.300' : 'text.secondary',
                  fontWeight: 400,
                }}
              >
                {description}
              </Typography>
            </m.div>
          )}

          {ctaButtons.length > 0 && (
            <m.div variants={varFade().inUp}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent={alignmentMap[alignment]}
              >
                {ctaButtons.map((button, index) => {
                  let buttonVariant = 'text';

                  if (button.style === 'primary') {
                    buttonVariant = 'contained';
                  } else if (button.style === 'secondary') {
                    buttonVariant = 'outlined';
                  }

                  return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    size="large"
                    color={button.style === 'primary' ? 'primary' : 'inherit'}
                    href={button.url}
                    target={button.openInNewTab ? '_blank' : '_self'}
                    rel={button.openInNewTab ? 'noopener noreferrer' : undefined}
                    startIcon={button.icon ? <Iconify icon={button.icon} /> : null}
                    sx={{
                      ...(backgroundImage || backgroundVideo && button.style === 'text' && {
                        color: 'common.white',
                      }),
                    }}
                  >
                    {button.text}
                  </Button>
                  );
                })}
              </Stack>
            </m.div>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

HeroSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      backgroundImage: PropTypes.string,
      backgroundVideo: PropTypes.string,
      overlayOpacity: PropTypes.number,
      heading: PropTypes.string.isRequired,
      subheading: PropTypes.string,
      description: PropTypes.string,
      ctaButtons: PropTypes.arrayOf(
        PropTypes.shape({
          text: PropTypes.string.isRequired,
          url: PropTypes.string.isRequired,
          style: PropTypes.oneOf(['primary', 'secondary', 'outline', 'text']),
          icon: PropTypes.string,
          openInNewTab: PropTypes.bool,
        })
      ),
      alignment: PropTypes.oneOf(['left', 'center', 'right']),
      height: PropTypes.oneOf(['full', 'auto', 'custom']),
    }).isRequired,
    settings: PropTypes.object,
  }).isRequired,
};
