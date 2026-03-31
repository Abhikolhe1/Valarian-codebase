import { AnimatePresence, m, useScroll, useSpring, useTransform } from 'framer-motion';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
// components
import Image from 'src/components/image';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// Sample product data - replace with your actual data
const PRODUCTS = [
  {
    id: 1,
    title: 'Premium Classic T-Shirt',
    description: 'Crafted with premium cotton for ultimate comfort and style. Perfect for everyday wear.Crafted with premium cotton for ultimate comfort and style. Perfect for everyday wear.Crafted with premium cotton for ultimate comfort and style. Perfect for everyday wear.',
    image: '/assets/images/home/scroll-animation/tshirt1-removebg-preview.png',
    buttonText: 'Shop Now',
    buttonLink: paths.product.root,
  },
  {
    id: 2,
    title: 'Essential Comfort Fit',
    description: 'Experience the perfect blend of comfort and durability. Made to last, designed to impress.',
    image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
    buttonText: 'Explore',
    buttonLink: paths.product.root,
  },
  {
    id: 3,
    title: 'Modern Fit Premium',
    description: 'Contemporary design meets classic elegance. Elevate your wardrobe with this timeless piece.',
    image: '/assets/images/home/scroll-animation/tshirt3-removebg-preview.png',
    buttonText: 'Discover',
    buttonLink: paths.product.root,
  },
  {
    id: 4,
    title: 'Signature Collection',
    description: 'Our signature piece that defines quality and style. A must-have for the modern wardrobe.',
    image: '/assets/images/home/scroll-animation/tshirt2-removebg-preview.png',
    buttonText: 'View Collection',
    buttonLink: paths.product.root,
  },
];

// ----------------------------------------------------------------------

// Image item component - separate component to use hooks properly
function ImageItem({ product, index: imageIndex, smoothIndex, isMobile }) {
  // Determine if this image is the main (active) or blurred (next) image
  const isMainImage = useTransform(
    smoothIndex,
    (latest) => Math.abs(latest - imageIndex) < 0.5
  );

  const isNextImage = useTransform(
    smoothIndex,
    (latest) => latest > imageIndex && latest < imageIndex + 1
  );

  // Calculate opacity
  // Main image: full opacity (1)
  // Next blurred image (imageIndex + 1): low opacity (0.3-0.4), fades in as it transitions
  // Others: invisible (0)
  const opacity = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        const progress = latest - currentIndex;
        // Fade out as it transitions out
        return Math.max(0, 1 - progress * 2);
      }

      // This is the NEXT image (nextIndex) that should be visible in background
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        // Starts at low opacity when visible, increases as it becomes main
        if (progress < 0) return 0; // Not visible yet
        return Math.min(1, 0.3 + progress * 0.7); // 0.3 to 1.0
      }

      return 0;
    }
  );

  // Calculate scale
  // Main image: larger scale (1.2-1.3 for bigger size)
  // Next blurred image (imageIndex + 1): smaller scale (0.5-0.6), scales up as it transitions
  const scale = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        const progress = latest - currentIndex;
        const mainScale = isMobile ? 1.15 : 1.25;
        // Scale down slightly as it transitions out
        return Math.max(0.85, mainScale - progress * (mainScale - 0.85) * 0.15);
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        const startScale = isMobile ? 0.6 : 0.5;
        const endScale = isMobile ? 1.15 : 1.25;
        if (progress < 0) return startScale; // Start at small scale
        return startScale + Math.min(1, progress) * (endScale - startScale);
      }

      return isMobile ? 0.6 : 0.5; // Smaller default scale
    }
  );

  // Calculate blur
  // Main image: no blur (0)
  // Next blurred image (imageIndex + 1): blurred (8-12px), blur decreases as it transitions
  const blur = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        const progress = latest - currentIndex;
        // Slight blur as it fades out
        return progress * 4;
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        const startBlur = isMobile ? 8 : 12;
        // Blur decreases as it becomes main
        if (progress < 0) return startBlur; // Start blurred
        return startBlur - Math.min(1, progress) * startBlur; // 12px to 0px
      }

      return isMobile ? 8 : 12;
    }
  );

  // Calculate z-index
  // Main image: highest z-index (10)
  // Next image (imageIndex + 1): lower z-index (5), increases as it becomes main
  const zIndex = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        return 10; // On top
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        // Z-index increases as it becomes main
        if (progress < 0) return 5; // Start behind
        return 5 + Math.round(Math.min(1, progress) * 5); // 5 to 10
      }

      return 1;
    }
  );

  // Calculate filter string from blur value
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  // Position calculation based on provided CSS
  // Desktop: Main image: top: 30%, left: 16%, translateX(-30%), translateY(0%)
  // Desktop: Blurred image: top: 8%, left: 50%, translateX(-29.9%), translateY(-0.05%)
  // Mobile: Main image: centered (top: 50%, left: 50%, translateX(-50%), translateY(-50%))
  // Mobile: Blurred image: right side, slightly top (top: 10%, right: 10%)

  const positionTop = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        if (isMobile) {
          return '50%'; // Centered vertically on mobile
        }
        return '30%'; // Desktop: top: 30%
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        if (isMobile) {
          // Mobile: from top: 10% to top: 50%
          const startTop = 10;
          const endTop = 50;
          const currentTop = startTop + (endTop - startTop) * progress;
          return `${currentTop}%`;
        }
        // Desktop: from top: 8% to top: 30%
        const startTop = 8;
        const endTop = 30;
        const currentTop = startTop + (endTop - startTop) * progress;
        return `${currentTop}%`;
      }

      // Default: blurred image position (for next image when visible)
      if (imageIndex === nextIndex) {
        return isMobile ? '10%' : '8%';
      }

      return '0%';
    }
  );

  const positionLeft = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        if (isMobile) {
          return '50%'; // Centered horizontally on mobile
        }
        return '16%'; // Desktop: left: 16%
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        if (isMobile) {
          // Mobile: from right: 10% (left: auto, right: 10%) to left: 50%
          // For mobile, we'll use left positioning transitioning from ~85% to 50%
          const startLeft = 85; // Approximate right: 10% position
          const endLeft = 50;
          const currentLeft = startLeft + (endLeft - startLeft) * Math.min(1, Math.max(0, progress));
          return `${currentLeft}%`;
        }
        // Desktop: from left: 50% to left: 16%
        const startLeft = 50;
        const endLeft = 16;
        const currentLeft = startLeft + (endLeft - startLeft) * Math.min(1, Math.max(0, progress));
        return `${currentLeft}%`;
      }

      // Default: blurred image position (for next image when visible)
      if (imageIndex === nextIndex) {
        if (isMobile) {
          return '85%'; // Right side on mobile (approximate)
        }
        return '50%'; // Desktop
      }

      return '0%';
    }
  );

  const positionRight = useTransform(
    smoothIndex,
    (latest) => {
      if (!isMobile) return 'auto'; // Desktop uses left positioning

      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        return 'auto'; // Centered, use left instead
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        if (progress < 0.5 && progress >= 0) {
          return '10%'; // Still on right side
        }
        return 'auto'; // Switch to left positioning
      }

      // Default: blurred image on right (for next image when visible)
      if (imageIndex === nextIndex) {
        return '10%';
      }

      return 'auto';
    }
  );

  const translateX = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        if (isMobile) {
          return '-50%'; // Centered on mobile
        }
        return '-30%'; // Desktop: translateX(-30%)
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        if (isMobile) {
          // Mobile: from ~0% to -50%
          const startX = 0;
          const endX = -50;
          const currentX = startX + (endX - startX) * Math.min(1, Math.max(0, progress));
          return `${currentX}%`;
        }
        // Desktop: from translateX(-29.9%) to translateX(-30%)
        const startX = -29.9;
        const endX = -30;
        const currentX = startX + (endX - startX) * Math.min(1, Math.max(0, progress));
        return `${currentX}%`;
      }

      // Default: blurred image translateX (for next image when visible)
      if (imageIndex === nextIndex) {
        if (isMobile) {
          return '0%'; // Right side positioning on mobile
        }
        return '-29.9%'; // Desktop
      }

      return '0%';
    }
  );

  const translateY = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        if (isMobile) {
          return '-50%'; // Centered on mobile
        }
        return '0%'; // Desktop: translateY(0%)
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex) {
        const progress = latest - currentIndex;
        if (isMobile) {
          // Mobile: from slight top to center
          const startY = -5; // Slightly top
          const endY = -50;
          const currentY = startY + (endY - startY) * Math.min(1, Math.max(0, progress));
          return `${currentY}%`;
        }
        // Desktop: from translateY(-0.05%) to translateY(0%)
        const startY = -0.05;
        const endY = 0;
        const currentY = startY + (endY - startY) * Math.min(1, Math.max(0, progress));
        return `${currentY}%`;
      }

      // Default: blurred image translateY (for next image when visible)
      if (imageIndex === nextIndex) {
        if (isMobile) {
          return '-5%'; // Slightly top on mobile
        }
        return '-0.05%'; // Desktop
      }

      return '0%';
    }
  );

  // Calculate max size based on whether it's main or next image
  const maxSize = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);
      const nextIndex = currentIndex + 1;

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        return '85%'; // Main image: max-width/max-height: 85%
      }

      // This is the NEXT image (nextIndex) coming forward
      if (imageIndex === nextIndex && latest >= currentIndex && latest < nextIndex + 0.5) {
        return '40%'; // Blurred image: max-width/max-height: 40%
      }

      // Default for next image
      if (imageIndex === nextIndex) {
        return '40%';
      }

      return '40%';
    }
  );

  // Calculate width for main image (350px)
  const imageWidth = useTransform(
    smoothIndex,
    (latest) => {
      const currentIndex = Math.floor(latest);

      // This is the main/active image (currentIndex)
      if (imageIndex === currentIndex) {
        return '350px'; // Main image: width: 350px
      }

      return 'auto'; // Blurred image: width: auto
    }
  );

  return (
    <Box
      component={m.div}
      style={{
        position: 'absolute',
        top: positionTop,
        left: isMobile ? positionLeft : positionLeft,
        right: isMobile ? positionRight : 'auto',
        width: imageWidth,
        height: 'auto',
        opacity,
        scale,
        zIndex,
        x: translateX,
        y: translateY,
        filter,
        transformOrigin: 'center center',
        maxWidth: maxSize,
        maxHeight: maxSize,
      }}
      sx={{
        willChange: 'transform, opacity, filter, max-width, max-height, top, left, right, width',
      }}
    >
      <Image
        src={product.image}
        alt={product.title}
        disabledEffect
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </Box>
  );
}

ImageItem.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    image: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  smoothIndex: PropTypes.object.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

// ----------------------------------------------------------------------

export default function HomeScrollAnimated({ products: propProducts, cmsData, ...other }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const wrapperRef = useRef(null);
  const spacerRef = useRef(null);
  const containerRef = useRef(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // Use CMS data if available, otherwise use prop products, fallback to PRODUCTS
  const products = cmsData?.content?.products || propProducts || PRODUCTS;

  // Number of products
  const productCount = products.length;

  // Calculate scroll progress - track from when wrapper enters viewport until spacer ends
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  // Calculate which product index we're currently showing based on scroll progress
  const currentIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, productCount - 1]
  );

  // Use spring for smooth index transitions
  const smoothIndex = useSpring(currentIndex, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Update current product index for text rendering
  useEffect(() => {
    const unsubscribe = smoothIndex.on('change', (latest) => {
      const newIndex = Math.round(latest);
      if (newIndex !== currentProductIndex && newIndex >= 0 && newIndex < productCount) {
        setCurrentProductIndex(newIndex);
      }
    });
    return () => unsubscribe();
  }, [smoothIndex, currentProductIndex, productCount]);

  // Render text content for current product
  const renderTextContent = () => {
    const product = products[currentProductIndex];
    if (!product) return null;

    return (
      <AnimatePresence mode="wait">
        <m.div
          key={product.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
        >
          <Stack
            spacing={3}
            sx={{
              maxWidth: { xs: '100%', md: 520 },
              maxHeight: { xs: '50%', md: 'auto' },
              mx: { xs: 'auto', md: 0 },
              textAlign: { xs: 'center', md: 'left' },
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                mb: 1,
              }}
            >
              {product.title}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: 'text.secondary',
                lineHeight: 1.8,
                maxHeight: '5.4em', // 👈 3 lines
                overflowY: 'auto',
              }}
            >
              {product.description}
            </Typography>


            <Button
              component={RouterLink}
              href={product.buttonLink}
              variant="contained"
              size="large"
              color="secondary"
              sx={{
                minWidth: { xs: '100%', md: 180 },
                // py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {product.buttonText}
            </Button>
          </Stack>
        </m.div>
      </AnimatePresence>
    );
  };

  // Render image stack
  const renderImageStack = () => (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: { md: '80vh' },
        minHeight: { xs: 350, sm: 600, md: 600 },
        overflow: 'visible',
      }}
    >
      {products.map((product, index) => (
        <ImageItem
          key={product.id}
          product={product}
          index={index}
          smoothIndex={smoothIndex}
          isMobile={isMobile}
        />
      ))}
    </Box>
  );

  return (
    <Box
      ref={wrapperRef}
      {...other}
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: 'background.default',
      }}
    >
      {/* Sticky container - comes first so it's visible immediately */}
      <Box
        ref={containerRef}
        component={m.div}
        sx={{
          position: 'sticky',
          top: 0,
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.default',
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            width: '100%',
            py: { xs: 8, md: 10 },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
            }}
          >
            {/* Text Content - Left side on desktop, below image on mobile */}
            <Box
              sx={{
                order: { xs: 2, md: 1 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'center', md: 'flex-start' },
                minHeight: { xs: 'auto', md: '60vh' },
              }}
            >
              {renderTextContent()}
            </Box>

            {/* Image Stack - Right side on desktop, top on mobile */}
            <Box
              sx={{
                order: { xs: 1, md: 2 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {renderImageStack()}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Spacer to create scroll space - each product gets 100vh */}
      {/* Positioned after sticky container so scroll works correctly */}
      <Box
        ref={spacerRef}
        sx={{
          height: `${productCount * 100}vh`,
        }}
      />
    </Box>
  );
}

HomeScrollAnimated.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      buttonText: PropTypes.string.isRequired,
      buttonLink: PropTypes.string.isRequired,
    })
  ),
  cmsData: PropTypes.shape({
    content: PropTypes.shape({
      products: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          image: PropTypes.string.isRequired,
          buttonText: PropTypes.string.isRequired,
          buttonLink: PropTypes.string.isRequired,
        })
      ),
    }),
  }),
};
