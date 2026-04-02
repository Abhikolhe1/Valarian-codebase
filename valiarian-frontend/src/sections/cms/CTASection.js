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

export default function CTASection({ section }) {
  const { content } = section;
  const {
    heading,
    description,
    backgroundImage,
    backgroundColor,
    buttons = [],
    alignment = 'center',
  } = content;

  const alignmentMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  const hasBackground = backgroundImage || backgroundColor;
  const stackMarginX = alignment === 'center' ? 'auto' : 0;
  let stackMarginLeft = 0;

  if (alignment === 'right' || alignment === 'center') {
    stackMarginLeft = 'auto';
  }

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        ...(backgroundColor && !backgroundImage && {
          bgcolor: backgroundColor,
        }),
      }}
    >
      {/* Background Image */}
      {backgroundImage && (
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

      {/* Overlay */}
      {backgroundImage && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: (theme) => alpha(theme.palette.grey[900], 0.6),
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
          spacing={4}
          alignItems={alignmentMap[alignment]}
          sx={{
            maxWidth: 800,
            mx: stackMarginX,
            ml: stackMarginLeft,
          }}
        >
          <m.div variants={varFade().inDown}>
            <Typography
              variant="h2"
              sx={{
                color: hasBackground ? 'common.white' : 'text.primary',
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
                  color: hasBackground ? 'grey.300' : 'text.secondary',
                  fontWeight: 400,
                }}
              >
                {description}
              </Typography>
            </m.div>
          )}

          {buttons.length > 0 && (
            <m.div variants={varFade().inUp}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent={alignmentMap[alignment]}
              >
                {buttons.map((button, index) => {
                  let buttonVariant = 'text';
                  const hasOutlinedStyle =
                    button.style === 'secondary' || button.style === 'outline';
                  let backgroundButtonSx = {};

                  if (button.style === 'primary') {
                    buttonVariant = 'contained';
                  } else if (hasOutlinedStyle) {
                    buttonVariant = 'outlined';
                  }

                  if (hasBackground) {
                    if (hasOutlinedStyle) {
                      backgroundButtonSx = {
                        borderColor: 'common.white',
                        color: 'common.white',
                        '&:hover': {
                          borderColor: 'common.white',
                          bgcolor: alpha('#fff', 0.1),
                        },
                      };
                    } else if (button.style === 'text') {
                      backgroundButtonSx = {
                        color: 'common.white',
                      };
                    }
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
                      minWidth: 160,
                      ...(hasBackground && {
                        ...backgroundButtonSx,
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

CTASection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.shape({
      heading: PropTypes.string.isRequired,
      description: PropTypes.string,
      backgroundImage: PropTypes.string,
      backgroundColor: PropTypes.string,
      buttons: PropTypes.arrayOf(
        PropTypes.shape({
          text: PropTypes.string.isRequired,
          url: PropTypes.string.isRequired,
          style: PropTypes.oneOf(['primary', 'secondary', 'outline', 'text']),
          icon: PropTypes.string,
          openInNewTab: PropTypes.bool,
        })
      ),
      alignment: PropTypes.oneOf(['left', 'center', 'right']),
    }).isRequired,
    settings: PropTypes.object,
  }).isRequired,
};
