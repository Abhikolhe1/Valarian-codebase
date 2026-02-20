import { m, useScroll, useSpring, useTransform } from 'framer-motion';
import PropTypes from 'prop-types';
import { useRef } from 'react';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
// components
import Image from 'src/components/image';

// ----------------------------------------------------------------------

// Fabric data using files from public/assets/images/home/fabric
const FABRICS = [
  {
    id: 1,
    name: 'Premium Egyptian Cotton',
    description: 'Sourced from the finest Egyptian cotton fields, this luxurious fabric offers unmatched softness and breathability. Perfect for everyday comfort.',
    image: '/assets/images/home/fabric/fabric1.webp',
    video: '/assets/images/home/fabric/fabric1.mp4',
    tags: ['100% Cotton', 'Breathable', 'Durable'],
  },
  {
    id: 2,
    name: 'Organic Bamboo Fiber',
    description: 'Eco-friendly and naturally antimicrobial, bamboo fiber provides exceptional moisture-wicking properties and a silky smooth texture.',
    image: '/assets/images/home/fabric/fabric2.jpg',
    video: '/assets/images/home/fabric/fabric2.mp4',
    tags: ['Sustainable', 'Antimicrobial', 'Moisture-Wicking'],
  },
  {
    id: 3,
    name: 'Supima Cotton Blend',
    description: 'Premium Supima cotton blended with spandex for enhanced stretch and shape retention. Ideal for a modern, fitted silhouette.',
    image: '/assets/images/home/fabric/fabric1.webp',
    video: '/assets/images/home/fabric/fabric1.mp4',
    tags: ['Elastic', 'Shape Retention', 'Premium'],
  },
  {
    id: 4,
    name: 'Linen-Cotton Mix',
    description: 'The perfect blend of natural linen and cotton creates a fabric that is both sophisticated and comfortable, with excellent temperature regulation.',
    image: '/assets/images/home/fabric/fabric2.jpg',
    video: '/assets/images/home/fabric/fabric2.mp4',
    tags: ['Temperature Regulating', 'Elegant', 'Natural'],
  },
];

// ----------------------------------------------------------------------

// Fabric Item Component - handles individual fabric animation
function FabricItem({ fabric, index: fabricIndex, smoothIndex, isMobile, totalFabrics }) {
  // Determine if this fabric is the active one
  const isActive = useTransform(
    smoothIndex,
    (latest) => Math.floor(latest) === fabricIndex
  );

  // Calculate opacity based on scroll position
  // Ensure clean transition: current fabric completely fades out before next appears
  const opacity = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;
      const progress = latest - currentIndex;

      // Current active fabric - fade out completely
      if (fabricIndex === currentIndex) {
        // Fade out faster so it's gone before next appears
        if (progress < 0.5) {
          return 1 - progress * 2; // Fade from 1 to 0 in first half
        }
        return 0; // Completely hidden in second half
      }

      // Next fabric - only appear after current is completely gone (progress > 0.5)
      if (fabricIndex === nextIndex) {
        if (progress <= 0.5) {
          return 0; // Hidden until current fabric is gone
        }
        // Fade in during second half
        return (progress - 0.5) * 2; // Fade from 0 to 1 in second half
      }

      // All other fabrics are hidden
      return 0;
    }
  );

  // Calculate translateY for smooth slide animation
  // Clean transitions: current moves out before next moves in
  const translateY = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;
      const progress = latest - currentIndex;

      if (fabricIndex === currentIndex) {
        // Slide out upward - complete movement in first half
        if (progress < 0.5) {
          return progress * 40; // Move out quickly in first half
        }
        return 40; // Stay out in second half
      }

      if (fabricIndex === nextIndex) {
        // Slide in from below - only start after current is gone (progress > 0.5)
        if (progress <= 0.5) {
          return 40; // Stay below viewport until current is gone
        }
        // Slide in during second half
        return 40 - (progress - 0.5) * 80; // Move from 40 to 0 in second half
      }

      // First fabric at start - no translation
      if (fabricIndex === 0 && latest < 0.5) {
        return 0;
      }

      return 40; // Start below viewport
    }
  );

  // Determine layout direction (alternating)
  const isEvenIndex = fabricIndex % 2 === 0;

  // Helper function to render media (image or video) - only one, not both
  const renderMedia = (containerSx = {}) => {
    // Priority: video first if available, otherwise image
    if (fabric.video) {
      return (
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            ...containerSx,
          }}
          onError={(e) => {
            console.error('Video failed to load:', e);
            // Hide video on error, fallback to image if available
            if (e.currentTarget) {
              e.currentTarget.style.display = 'none';
            }
          }}
        >
          <source src={fabric.video} type="video/mp4" />
          <source src={fabric.video} type="video/webm" />
          Your browser does not support the video tag.
        </Box>
      );
    }

    // Fallback to image if no video or video fails
    if (fabric.image) {
      return (
        <Image
          src={fabric.image}
          alt={fabric.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            ...containerSx,
          }}
        />
      );
    }

    return null;
  };

  if (isMobile) {
    // Mobile: Vertical stacking with alternating image/content positions
    return (
      <Box
        component={m.div}
        style={{
          opacity,
          y: translateY,
        }}
        sx={{
          width: '100%',
          mb: { xs: 8, sm: 10 },
        }}
      >
        {isEvenIndex ? (
          // Even index: Media top, content below
          <>
            <Box
              sx={{
                width: '100%',
                mb: 4,
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}
            >
              {renderMedia()}
            </Box>
            <Stack spacing={2}>
              <Typography variant="h4" component="h3">
                {fabric.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {fabric.description}
              </Typography>
              {fabric.tags && fabric.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {fabric.tags.map((tag) => (
                    <Box
                      key={tag}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'background.neutral',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {tag}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </>
        ) : (
          // Odd index: Content top, image below
          <>
            <Stack spacing={2} mb={4}>
              <Typography variant="h4" component="h3">
                {fabric.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {fabric.description}
              </Typography>
              {fabric.tags && fabric.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {fabric.tags.map((tag) => (
                    <Box
                      key={tag}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'background.neutral',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {tag}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
            <Box
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}
            >
              {renderMedia()}
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Desktop: Horizontal alternating layout
  // Even index (0, 2, 4...): Image/Video LEFT, Text RIGHT
  // Odd index (1, 3, 5...): Text LEFT, Image/Video RIGHT
  return (
    <Box
      component={m.div}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity,
        y: translateY,
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        willChange: 'transform, opacity',
      }}
    >
      <Container maxWidth="lg" sx={{ width: '100%' }}>
        {isEvenIndex ? (
          // Even index: Image/Video on LEFT, Text on RIGHT
          <Stack direction="row" spacing={6} alignItems="center">
            <Box
              sx={{
                width: '50%',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}
            >
              {renderMedia()}
            </Box>
            <Stack spacing={3} sx={{ width: '50%' }}>
              <Typography variant="h3" component="h2">
                {fabric.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                {fabric.description}
              </Typography>
              {fabric.tags && fabric.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {fabric.tags.map((tag) => (
                    <Box
                      key={tag}
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: 'background.neutral',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {tag}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        ) : (
          // Odd index: Text on LEFT, Image/Video on RIGHT
          <Stack direction="row-reverse" spacing={6} alignItems="center">
            <Box
              sx={{
                width: '50%',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}
            >
              {renderMedia()}
            </Box>
            <Stack spacing={3} sx={{ width: '50%' }}>
              <Typography variant="h3" component="h2">
                {fabric.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                {fabric.description}
              </Typography>
              {fabric.tags && fabric.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {fabric.tags.map((tag) => (
                    <Box
                      key={tag}
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: 'background.neutral',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {tag}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

FabricItem.propTypes = {
  fabric: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    image: PropTypes.string,
    video: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  index: PropTypes.number.isRequired,
  smoothIndex: PropTypes.object.isRequired,
  isMobile: PropTypes.bool.isRequired,
  totalFabrics: PropTypes.number.isRequired,
};

// ----------------------------------------------------------------------

export default function HomeFabricSection({ fabrics: propFabrics, cmsData, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Wrapper ref for scroll tracking
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const spacerRef = useRef(null);

  // Use CMS data for title and subtitle
  const title = cmsData?.content?.title || 'Premium Fabrics';
  const subtitle = cmsData?.content?.subtitle || 'Discover the exceptional materials that make our clothing extraordinary';

  // Use prop fabrics if provided, otherwise use FABRICS
  const fabrics = propFabrics || FABRICS;

  // Calculate scroll progress - track the wrapper
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress to fabric index (0 to fabrics.length - 1)
  // Clamp to ensure we don't go beyond the last fabric
  const fabricIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, Math.max(fabrics.length - 1, 0)]
  );

  // Smooth the index for better animation
  const smoothIndex = useSpring(fabricIndex, {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });

  if (isMobile) {
    // Mobile: No sticky, just stack vertically with animations
    return (
      <Box
        ref={wrapperRef}
        component="section"
        sx={{
          py: { xs: 8, md: 10 },
          bgcolor: 'background.default',
          position: 'relative',
        }}
        {...other}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Stack spacing={2} sx={{ mb: { xs: 6, sm: 8 }, textAlign: 'center' }}>
            <Typography variant="h2" component="h1">
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              {subtitle}
            </Typography>
          </Stack>

          {/* Fabric Items */}
          <Box
            ref={containerRef}
            sx={{
              position: 'relative',
              minHeight: '200vh', // Create scrollable space
            }}
          >
            {fabrics.map((fabric, index) => (
              <FabricItem
                key={fabric.id}
                fabric={fabric}
                index={index}
                smoothIndex={smoothIndex}
                isMobile={isMobile}
                totalFabrics={fabrics.length}
              />
            ))}
          </Box>
        </Container>
      </Box>
    );
  }

  // Desktop: Sticky container with scroll-driven animations
  return (
    <Box
      component="section"
      ref={wrapperRef}
      sx={{
        position: 'relative',
        bgcolor: 'background.default',
        minHeight: `${Math.max(fabrics.length, 2) * 100}vh`, // Create scroll space for the section
      }}
      {...other}
    >
      {/* Sticky Container */}
      <Box
        ref={containerRef}
        sx={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          py: 10,
        }}
      >
        <Box
          sx={{
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Header - Fixed at top */}
          <Container maxWidth="lg" sx={{ mb: 8 }}>
            <Stack spacing={2} sx={{ textAlign: 'center' }}>
              <Typography variant="h2" component="h1">
                {title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                {subtitle}
              </Typography>
            </Stack>
          </Container>

          {/* Fabric Items - Animated based on scroll */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: '60vh',
            }}
          >
            {fabrics.map((fabric, index) => (
              <FabricItem
                key={fabric.id}
                fabric={fabric}
                index={index}
                smoothIndex={smoothIndex}
                isMobile={isMobile}
                totalFabrics={fabrics.length}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

HomeFabricSection.propTypes = {
  fabrics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      image: PropTypes.string,
      video: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  cmsData: PropTypes.shape({
    content: PropTypes.shape({
      title: PropTypes.string,
      subtitle: PropTypes.string,
      description: PropTypes.string,
    }),
  }),
};
