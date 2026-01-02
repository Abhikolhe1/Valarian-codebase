import { useRef, useEffect, useState } from 'react';
// @mui
import { useTheme, styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
// hooks
import { useMarqueeVisibility } from 'src/hooks/use-marquee-visibility';

// ----------------------------------------------------------------------

const OFFERS = [
  'Flat 20% off on premium polos',
  'Free shipping on orders above ₹1999',
  'Limited edition drop – Shop now',
];

const StyledMarqueeContainer = styled(Box)(({ theme, visible }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.appBar + 1,
  height: 36,
  backgroundColor: theme.palette.grey[900],
  color: theme.palette.common.white,
  overflow: 'hidden',
  transform: visible ? 'translateY(0)' : 'translateY(-100%)',
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? 'auto' : 'none',
  transition: theme.transitions.create(['transform', 'opacity'], {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  display: 'flex',
  alignItems: 'center',
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  [theme.breakpoints.down('sm')]: {
    height: 32,
  },
}));

const StyledMarqueeWrapper = styled(Box)({
  display: 'flex',
  width: '100%',
  height: '100%',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
});

const StyledMarqueeTrack = styled(Box)(({ theme, offset }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  willChange: 'transform',
  transform: `translateX(${offset}px)`,
  transition: 'none',
  [theme.breakpoints.down('sm')]: {
    // Same behavior on mobile
  },
}));

const StyledMarqueeItem = styled(Typography)(({ theme }) => ({
  display: 'inline-block',
  paddingRight: theme.spacing(8),
  fontSize: '0.8125rem',
  fontWeight: 400,
  letterSpacing: '0.03em',
  color: alpha(theme.palette.common.white, 0.95),
  flexShrink: 0,
  textTransform: 'uppercase',
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.75rem',
    paddingRight: theme.spacing(6),
    letterSpacing: '0.02em',
  },
}));

const StyledSeparator = styled(Box)(({ theme }) => ({
  width: 4,
  height: 4,
  borderRadius: '50%',
  backgroundColor: alpha(theme.palette.common.white, 0.4),
  marginRight: theme.spacing(8),
  flexShrink: 0,
  [theme.breakpoints.down('sm')]: {
    marginRight: theme.spacing(6),
  },
}));

// ----------------------------------------------------------------------

export default function OfferMarquee() {
  const theme = useTheme();
  const isVisible = useMarqueeVisibility();
  const trackRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const setWidthRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Create seamless infinite loop by duplicating offers multiple times
  // Using 3 sets ensures we always have content ready when looping
  const seamlessOffers = [...OFFERS, ...OFFERS, ...OFFERS];

  // Calculate the exact width of one set of offers
  useEffect(() => {
    if (!isVisible || !trackRef.current) {
      setIsReady(false);
      return undefined;
    }

    let debounceTimeout;

    const calculateSetWidth = () => {
      const track = trackRef.current;
      if (!track) return;

      const items = track.children;
      if (items.length === 0) return;

      // Calculate width of one set (OFFERS.length items)
      let oneSetWidth = 0;
      const itemsPerSet = OFFERS.length;
      
      for (let i = 0; i < itemsPerSet; i += 1) {
        if (items[i]) {
          oneSetWidth += items[i].offsetWidth;
        }
      }

      // Only update if width changed significantly (more than 1px difference)
      // This prevents unnecessary updates that cause stuttering
      if (oneSetWidth > 0 && Math.abs(setWidthRef.current - oneSetWidth) > 1) {
        setWidthRef.current = oneSetWidth;
        setIsReady(true);
      } else if (oneSetWidth > 0 && setWidthRef.current === 0) {
        setWidthRef.current = oneSetWidth;
        setIsReady(true);
      }
    };

    // Debounced resize handler to prevent too frequent recalculations
    const debouncedCalculate = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        calculateSetWidth();
      }, 150);
    };

    // Use ResizeObserver with debouncing to recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      debouncedCalculate();
    });

    // Initial calculation with delay to ensure DOM is ready
    const resizeTimeout = setTimeout(() => {
      calculateSetWidth();
      if (trackRef.current) {
        resizeObserver.observe(trackRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(resizeTimeout);
      clearTimeout(debounceTimeout);
      resizeObserver.disconnect();
    };
  }, [isVisible]);

  // Continuous animation loop - truly seamless infinite scroll
  useEffect(() => {
    if (!isVisible || !isReady || setWidthRef.current === 0) {
      setOffset(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return undefined;
    }

    const speed = 60; // pixels per second (adjust for speed)
    let lastTime = performance.now();
    let currentOffset = 0; // Always start from 0 when animation begins

    const animate = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.016); // Cap at 60fps, convert to seconds
      lastTime = currentTime;

      // Move the offset continuously based on time
      currentOffset -= speed * deltaTime;

      // When we've scrolled exactly one set width, reset seamlessly
      // This creates a perfect loop because the content is duplicated 3 times
      // When we reset, we're showing the second set which is identical to the first
      const currentSetWidth = setWidthRef.current;
      if (currentSetWidth > 0 && Math.abs(currentOffset) >= currentSetWidth) {
        currentOffset += currentSetWidth; // Reset by adding back one set width
      }

      setOffset(currentOffset);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isVisible, isReady]);

  return (
    <StyledMarqueeContainer visible={isVisible}>
      <StyledMarqueeWrapper>
        <StyledMarqueeTrack ref={trackRef} offset={offset}>
          {seamlessOffers.map((offer, index) => (
            <Box 
              key={`marquee-offer-${index}`} 
              sx={{ 
                display: 'inline-flex', 
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <StyledMarqueeItem>{offer}</StyledMarqueeItem>
              <StyledSeparator />
            </Box>
          ))}
        </StyledMarqueeTrack>
      </StyledMarqueeWrapper>
    </StyledMarqueeContainer>
  );
}

