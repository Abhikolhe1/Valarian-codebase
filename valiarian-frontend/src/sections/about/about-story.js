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

// story data using files from public/assets/images/home/story
const STORY = [
  {
    id: 1,
    name: 'Where It All Began',
    description: 'Founded in 2018, Premium Cotton Polo was born from a simple observation: despite the popularity of polo shirts, it was difficult to find one that truly balanced comfort, quality, and timeless style. We set out to create the perfect polo—one crafted from the finest materials, designed to last, and elegant enough for any occasion.',
    image: '/assets/images/home/fabric/fabric1.webp',
    video: '/assets/images/home/fabric/fabric1.mp4',
  },
  {
    id: 2,
    name: 'Our Commitment to Quality',
    description: 'Every polo is made from long-staple premium cotton, sourced from certified suppliers who share our values. We work exclusively with ethical manufacturers in Portugal, ensuring every stitch meets our exacting standards. The result is a garment that feels exceptional from the first wear and only gets better with time.',
    image: '/assets/images/home/fabric/fabric2.jpg',
    video: '/assets/images/home/fabric/fabric2.mp4',
  },
  {
    id: 3,
    name: 'Sustainable by Design',
    description: "Sustainability isn't an afterthought—it's woven into every aspect of our business. We use OEKO-TEX certified dyes, operate carbon-neutral production facilities, and design our polos to be worn for years, not seasons. We believe the most sustainable garment is one that lasts.",
    image: '/assets/images/home/fabric/fabric2.jpg',
    video: '/assets/images/home/fabric/fabric2.mp4',
  },

];

// ----------------------------------------------------------------------

// story Item Component - handles individual story animation
function StoryItem({ story, index: storyIndex, smoothIndex, isMobile, totalStory }) {
  const storyTitle = story.title || story.name;
  // Determine if this story is the active one
  // Calculate opacity based on scroll position
  // Ensure clean transition: current story completely fades out before next appears
  const opacity = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;
      const progress = latest - currentIndex;

      // Current active story - fade out completely
      if (storyIndex === currentIndex) {
        // Fade out faster so it's gone before next appears
        if (progress < 0.5) {
          return 1 - progress * 2; // Fade from 1 to 0 in first half
        }
        return 0; // Completely hidden in second half
      }

      // Next story - only appear after current is completely gone (progress > 0.5)
      if (storyIndex === nextIndex) {
        if (progress <= 0.5) {
          return 0; // Hidden until current story is gone
        }
        // Fade in during second half
        return (progress - 0.5) * 2; // Fade from 0 to 1 in second half
      }

      // All other storys are hidden
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

      if (storyIndex === currentIndex) {
        // Slide out upward - complete movement in first half
        if (progress < 0.5) {
          return progress * 40; // Move out quickly in first half
        }
        return 40; // Stay out in second half
      }

      if (storyIndex === nextIndex) {
        // Slide in from below - only start after current is gone (progress > 0.5)
        if (progress <= 0.5) {
          return 40; // Stay below viewport until current is gone
        }
        // Slide in during second half
        return 40 - (progress - 0.5) * 80; // Move from 40 to 0 in second half
      }

      // First story at start - no translation
      if (storyIndex === 0 && latest < 0.5) {
        return 0;
      }

      return 40; // Start below viewport
    }
  );

  // Determine layout direction (alternating)
  const isEvenIndex = storyIndex % 2 === 0;

  // Helper function to render media (image or video) - only one, not both
  const renderMedia = (containerSx = {}) => {
    // Priority: video first if available, otherwise image
    if (story.video) {
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
          <source src={story.video} type="video/mp4" />
          <source src={story.video} type="video/webm" />
          Your browser does not support the video tag.
        </Box>
      );
    }

    // Fallback to image if no video or video fails
    if (story.image) {
      return (
        <Image
          src={story.image}
          alt={storyTitle}
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
    return (
      <Box
        component={m.div}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          opacity,
          y: translateY,
        }}
        sx={{
          px: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            aspectRatio: '4/3',
            mb: 3,
          }}
        >
          {renderMedia()}
        </Box>

        <Stack spacing={2}>
          <Typography variant="h5" color="primary.main">
            {storyTitle}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {story.description}
          </Typography>
        </Stack>
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
              <Typography variant="h3" component="h2" color="primary.main" >
                {storyTitle}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                {story.description}
              </Typography>
              {/* {story.tags && story.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {story.tags.map((tag) => (
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
              )} */}
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
              <Typography variant="h3" component="h2" color="primary.main">
                {storyTitle}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                {story.description}
              </Typography>
              {/* {story.tags && story.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {story.tags.map((tag) => (
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
              )} */}
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

StoryItem.propTypes = {
  story: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string.isRequired,
    image: PropTypes.string,
    video: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  index: PropTypes.number.isRequired,
  smoothIndex: PropTypes.object.isRequired,
  isMobile: PropTypes.bool.isRequired,
  totalStory: PropTypes.number.isRequired,
};

// ----------------------------------------------------------------------

export default function AboutStorySection({ stories: propStories, storys: legacyStories, cmsData, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Wrapper ref for scroll tracking
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  // // Use CMS data for title and subtitle
  // const title = cmsData?.content?.title || 'Premium Story';
  // const subtitle = cmsData?.content?.subtitle || 'Discover the exceptional materials that make our clothing extraordinary';

  // Use prop storys if provided, otherwise use STORY
  const storys = propStories || legacyStories || STORY;

  // Calculate scroll progress - track the wrapper
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress to story index (0 to storys.length - 1)
  // Clamp to ensure we don't go beyond the last story
  const storyIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, Math.max(storys.length - 1, 0)]
  );

  // Smooth the index for better animation
  const smoothIndex = useSpring(storyIndex, {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });

  if (isMobile) {
    return (
      <Box
        ref={wrapperRef}
        component="section"
        sx={{
          position: 'relative',
          bgcolor: 'background.default',
          minHeight: `${Math.max(storys.length, 2) * 100}vh`,
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            width: '100%',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: "center",
            alignItems: 'center',
            overflow: 'hidden',
            px: 2,
          }}
        >
          <Box sx={{ width: '100%', mt: -50, position: 'relative' }}>
            {storys.map((story, index) => (
              <StoryItem
                key={story.id}
                story={story}
                index={index}
                smoothIndex={smoothIndex}
                isMobile={isMobile}
                totalStory={storys.length}
              />
            ))}
          </Box>
        </Box>
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
        minHeight: `${Math.max(storys.length, 2) * 100}vh`, // Create scroll space for the section
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
          {/* <Container maxWidth="lg" sx={{ mb: 8 }}>
            <Stack spacing={2} sx={{ textAlign: 'center' }}>
              <Typography variant="h2" component="h1">
                {title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                {subtitle}
              </Typography>
            </Stack>
          </Container> */}

          {/* story Items - Animated based on scroll */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: '60vh',
            }}
          >
            {storys.map((story, index) => (
              <StoryItem
                key={story.id}
                story={story}
                index={index}
                smoothIndex={smoothIndex}
                isMobile={isMobile}
                totalStory={storys.length}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

AboutStorySection.propTypes = {
  stories: PropTypes.arrayOf(
    PropTypes.shape({
      description: PropTypes.string.isRequired,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      image: PropTypes.string,
      name: PropTypes.string,
      title: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      video: PropTypes.string,
    })
  ),
  storys: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      description: PropTypes.string.isRequired,
      image: PropTypes.string,
      video: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      title: PropTypes.string,
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
