import { m } from 'framer-motion';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
// components
import { MotionContainer, varFade } from 'src/components/animate';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export default function HomeCollectionHero({ imageSrc, videoSrc, cmsData, ...other }) {
  // Use CMS data if available
  const title = cmsData?.content?.title || 'COLLECTION';
  const subtitle = cmsData?.content?.subtitle || 'Explore our latest designs';
  const ctaText = cmsData?.content?.ctaText || 'View All';
  const ctaLink = cmsData?.content?.ctaLink || paths.product.root;
  const backgroundVideo = cmsData?.content?.backgroundVideo || videoSrc;
  const backgroundImage =
    cmsData?.content?.backgroundImage ||
    imageSrc ||
    '/assets/images/home/new-arrival/new-arrival-hero.jpeg';

  const hasVideo = Boolean(backgroundVideo);
  const hasImage = Boolean(backgroundImage);

  const renderMedia = () => {
    const mediaStyles = {
      width: '100%',
      height: '100%',
      maxHeight: '640px',
      objectFit: 'cover',
      objectPosition: 'center',
      display: 'block',
    };

    if (hasVideo) {
      return (
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          sx={mediaStyles}
          onError={(e) => {
            console.error('Video failed to load:', e);
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src={backgroundVideo} type="video/mp4" />
          <source src={backgroundVideo} type="video/webm" />
          Your browser does not support the video tag.
        </Box>
      );
    }

    if (hasImage) {
      return (
        <Box
          component="img"
          src={backgroundImage}
          alt="Collection"
          sx={mediaStyles}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    // Fallback if neither image nor video is provided
    return (
      <Box
        component="img"
        src="/assets/images/home/new-arrival/new-arrival-hero.jpeg"
        alt="Collection"
        sx={mediaStyles}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  };

  return (
    <Box
      {...other}
      sx={{
        position: 'relative',
        width: '100%',
        pt: { xs: 8, md: 10 },
        pb: { xs: 8, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container>
          <Grid xs={12}>
            <Grid
              container
              sx={{
                position: 'relative',
                width: '100%',
                maxHeight: '640px',
                height: '640px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
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
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    zIndex: 1,
                  },
                }}
              >
                {renderMedia()}
              </Box>

              <MotionContainer>
                <Grid
                  container
                  xs={12}
                  direction="column"
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    p: { xs: 3, md: 4 },
                  }}
                >
                  <Grid xs={12}>
                    <m.div variants={varFade().in}>
                      <Typography
                        variant="h1"
                        sx={{
                          color: 'common.white',
                          fontWeight: 700,
                          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          mb: { xs: 3, md: 4 },
                          textShadow: '2px 2px 8px rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        {title}
                      </Typography>
                    </m.div>
                  </Grid>

                  <Grid xs={12}>
                    <m.div variants={varFade().in}>
                      <Button
                        component={RouterLink}
                        href={ctaLink}
                        size="large"
                        variant="outlined"
                        sx={{
                          minWidth: 180,
                          py: 1.5,
                          px: 4,
                          fontSize: '1rem',
                          fontWeight: 600,
                          bgcolor: 'transparent',
                          color: 'common.white',
                          border: '2px solid',
                          borderColor: 'common.white',
                          '&:hover': {
                            bgcolor: 'transparent',
                            borderColor: 'common.white',
                          },
                        }}
                      >
                        {ctaText}
                      </Button>
                    </m.div>
                  </Grid>
                </Grid>
              </MotionContainer>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

HomeCollectionHero.propTypes = {
  imageSrc: PropTypes.string,
  videoSrc: PropTypes.string,
  cmsData: PropTypes.shape({
    content: PropTypes.shape({
      title: PropTypes.string,
      subtitle: PropTypes.string,
      backgroundImage: PropTypes.string,
      backgroundVideo: PropTypes.string,
      ctaText: PropTypes.string,
      ctaLink: PropTypes.string,
    }),
  }),
};
