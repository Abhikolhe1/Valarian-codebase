import PropTypes from 'prop-types';
import { m } from 'framer-motion';
// @mui
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// routes
import { paths } from 'src/routes/paths';
// layouts
import { HEADER } from 'src/layouts/config-layout';
// components
import Iconify from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';
import { MotionContainer, varFade } from 'src/components/animate';
import LogoAnimated from 'src/components/logo/logo-animated';
import TransparentCard from 'src/components/transparent-card';

// ----------------------------------------------------------------------

const StyledRoot = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.grey[200],
  [theme.breakpoints.up('md')]: {
    paddingTop: HEADER.H_DESKTOP_OFFSET,
  },
}));

const StyledMediaContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: alpha(theme.palette.grey[900], 0.3),
    zIndex: 1,
    [theme.breakpoints.up('md')]: {
      backgroundColor: alpha(theme.palette.grey[900], 0.2),
    },
  },
}));

const StyledImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
  display: 'block',
});

const StyledVideo = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
  display: 'block',
});

const StyledContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 50,
  left: 0,
  zIndex: 10,
  padding: theme.spacing(4),
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-start', // Align to left
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(3),
  },
}));

const StyledContentWrapper = styled(Stack)(({ theme }) => ({
  maxWidth: '520px',
  textAlign: 'left',
  alignItems: 'flex-start',
  [theme.breakpoints.down('sm')]: {
    maxWidth: '100%',
  },
}));


const StyledHeading = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.white,
  fontWeight: 500,
  fontSize: '2.5rem',
  letterSpacing: '0.05em',
  lineHeight: 1.2,
  marginBottom: 0,

  [theme.breakpoints.up('md')]: {
    fontSize: '3.5rem',
  },
  [theme.breakpoints.up('lg')]: {
    fontSize: '4rem',
  },
}));

// ----------------------------------------------------------------------

export default function HomeHero({ imageSrc, videoSrc, ...other }) {
  const hasVideo = Boolean(videoSrc);
  const hasImage = Boolean(imageSrc);

  const renderMedia = () => {
    if (hasVideo) {
      return (
        <StyledVideo
          autoPlay
          loop
          muted
          playsInline
          onError={(e) => {
            console.error('Video failed to load:', e);
            e.target.style.display = 'none';
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc} type="video/webm" />
          Your browser does not support the video tag.
        </StyledVideo>
      );
    }

    if (hasImage) {
      return (
        <StyledImage
          src={imageSrc}
          alt="Premium Cotton Polos"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    }

    // Fallback if neither image nor video is provided
    return (
      <StyledImage
        src="/assets/images/home/hero/polo-hero.jpg"
        alt="Premium Cotton Polos"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  };

  return (
    <StyledRoot {...other}>
      <LogoAnimated />

      <StyledMediaContainer
        sx={{
          background: 'linear-gradient(135deg, #E0E0E0 0%, #F5F5F5 100%)',
        }}
      >
        {renderMedia()}
      </StyledMediaContainer>

      <Box
        component={MotionContainer}
        sx={{
          position: 'absolute',
          zIndex: 10,
          height: '100%',
          width: '100%',
        }}
      >
        <StyledContent>
          <TransparentCard variant="default">
            <StyledContentWrapper spacing={3}>
              <m.div variants={varFade().in}>
                <StyledHeading variant="h1">
                  Premium Cotton Polos.
                </StyledHeading>
              </m.div>

              <m.div variants={varFade().in}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ flexWrap: 'wrap' }}
                >
                  <Button
                    component={RouterLink}
                    href={paths.product.root}
                    size="large"
                    variant="outlined"
                    sx={{
                      minWidth: { xs: '100%', sm: 180 },
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderColor: 'common.white',
                      color: 'common.white',
                      '&:hover': {
                        borderColor: 'common.white',
                        backgroundColor: alpha('#FFFFFF', 0.1),
                      },
                    }}
                  >
                    Explore Collection
                  </Button>
                </Stack>
              </m.div>
            </StyledContentWrapper>
          </TransparentCard>
        </StyledContent>
      </Box>
    </StyledRoot>
  );
}

HomeHero.propTypes = {
  imageSrc: PropTypes.string,
  videoSrc: PropTypes.string,
};
