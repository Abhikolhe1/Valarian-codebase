import { m } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
// layouts
import { HEADER } from 'src/layouts/config-layout';
// components
import { MotionContainer, varFade } from 'src/components/animate';
import LogoAnimated from 'src/components/logo/logo-animated';

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

const StyledMediaContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
});

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

const ContentPosition = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: '50%',
  bottom: '7vh',
  zIndex: 10,
  width: 'calc(100% - 32px)',
  transform: 'translateX(-50%)',
  display: 'flex',
  justifyContent: 'center',

  [theme.breakpoints.down('md')]: {
    bottom: theme.spacing(4),
  },
}));

// ----------------------------------------------------------------------

export default function HomeHero({ imageSrc, videoSrc, cmsData, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const desktopVideo = cmsData?.content?.backgroundVideo || videoSrc;
  const desktopImage = cmsData?.content?.backgroundImage || imageSrc;

  // Mobile-specific media is optional — falls back to the desktop media
  // whenever it isn't set, so existing heroes keep working unchanged.
  const resolvedVideo = isMobile
    ? cmsData?.content?.backgroundVideoMobile || desktopVideo
    : desktopVideo;
  const resolvedImage = isMobile
    ? cmsData?.content?.backgroundImageMobile || desktopImage
    : desktopImage;

  const hasVideo = Boolean(resolvedVideo);
  const hasImage = Boolean(resolvedImage);

  // iOS (and some Android browsers) silently pause an autoplaying
  // background video — most commonly Low Power Mode, but also happens on
  // an app-switch/lock-screen interruption or an orientation change. The
  // browser then shows its native paused state (a play/pause icon over the
  // video) instead of silently continuing the loop. Force a resume
  // whenever that happens, and again whenever the tab/app comes back into
  // the foreground, since a pause caused by backgrounding doesn't always
  // fire its own 'pause' event.
  const videoRef = useRef(null);
  const resumeVideo = () => {
    const video = videoRef.current;
    if (video && video.paused) {
      video.play().catch(() => {
        // Autoplay can still be legitimately blocked (e.g. Low Power Mode
        // holding firm) — nothing more to do without a user gesture.
      });
    }
  };

  useEffect(() => {
    if (!hasVideo) return undefined;
    document.addEventListener('visibilitychange', resumeVideo);
    window.addEventListener('pageshow', resumeVideo);
    return () => {
      document.removeEventListener('visibilitychange', resumeVideo);
      window.removeEventListener('pageshow', resumeVideo);
    };
  }, [hasVideo]);

  const title = cmsData?.content?.title || cmsData?.content?.heading || 'Premium Cotton Polos.';
  const ctaText =
    cmsData?.content?.ctaText ||
    cmsData?.content?.primaryButtonText ||
    cmsData?.content?.ctaButtons?.[0]?.text ||
    'Explore Collection';
  const ctaLink =
    cmsData?.content?.ctaLink ||
    cmsData?.content?.primaryButtonLink ||
    cmsData?.content?.ctaButtons?.[0]?.url ||
    paths.product.root;

  const renderMedia = () => {
    if (hasVideo) {
      return (
        // `key` forces a remount (and fresh <video> load) when the resolved
        // source changes, e.g. when crossing the mobile/desktop breakpoint —
        // browsers don't reliably pick up a changed <source> otherwise.
        <StyledVideo
          ref={videoRef}
          key={resolvedVideo}
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          disablePictureInPicture
          onPause={resumeVideo}
          onError={(e) => {
            console.error('Video failed to load:', e);
            e.target.style.display = 'none';
          }}
        >
          <source src={resolvedVideo} type="video/mp4" />
          <source src={resolvedVideo} type="video/webm" />
          Your browser does not support the video tag.
        </StyledVideo>
      );
    }

    if (hasImage) {
      return (
        <StyledImage
          key={resolvedImage}
          src={resolvedImage}
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

      <MotionContainer>
        <ContentPosition>
          <m.div variants={varFade().in}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  color: 'common.white',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  letterSpacing: '0.025em',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 12px rgba(0, 0, 0, 0.35)',
                  fontSize: { xs: '1.15rem', sm: '1.4rem', md: '1.65rem' },
                }}
              >
                {title}
              </Typography>

              {ctaText && ctaLink && (
                <Button
                  component={RouterLink}
                  href={ctaLink}
                  variant="text"
                  sx={{
                    minWidth: 0,
                    p: 0,
                    borderRadius: 0,
                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                    fontWeight: 700,
                    lineHeight: 1.5,
                    color: 'common.white',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    textTransform: 'none',
                    textShadow: '0 1px 8px rgba(0, 0, 0, 0.35)',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      opacity: 0.8,
                    },
                  }}
                >
                  {ctaText}
                </Button>
              )}
            </Box>
          </m.div>
        </ContentPosition>
      </MotionContainer>
    </StyledRoot>
  );
}

HomeHero.propTypes = {
  imageSrc: PropTypes.string,
  videoSrc: PropTypes.string,
  cmsData: PropTypes.object,
};
