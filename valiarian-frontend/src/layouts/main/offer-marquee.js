import { useRef, useEffect } from 'react';
// @mui
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
// hooks
import { useMarqueeVisibility } from 'src/hooks/use-marquee-visibility';
import { useSiteSettings } from 'src/hooks/use-site-settings';

// ----------------------------------------------------------------------

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
  pointerEvents: 'none',
  transform: visible ? 'translateY(0)' : 'translateY(-100%)',
  opacity: visible ? 1 : 0,
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

const StyledMarqueeTrack = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  willChange: 'transform',
  transform: 'translateX(0px)',
  transition: 'none',
});

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
  const isVisible = useMarqueeVisibility();
  const { settings } = useSiteSettings();
  const trackRef = useRef(null);
  const setWidthRef = useRef(0);
  const animationFrameRef = useRef(null);
  const offsetRef = useRef(0);
  const offers = (settings?.offers?.marquee || [])
    .map((item) => String(item?.text || '').trim())
    .filter(Boolean);
  const activeOffers = offers;

  // Create seamless infinite loop by duplicating offers multiple times
  // Using 3 sets ensures we always have content ready when looping
  const seamlessOffers = [...activeOffers, ...activeOffers, ...activeOffers];

  // Calculate the exact width of one set of offers.
  // Intentionally independent of `isVisible`: the marquee keeps running even while
  // the bar is hidden, so hiding/showing it must never tear down the measurement.
  useEffect(() => {
    if (!trackRef.current) {
      return undefined;
    }

    let debounceTimeout;

    const calculateSetWidth = () => {
      const track = trackRef.current;
      if (!track) return;

      const items = track.children;
      if (items.length === 0) return;

      // Calculate width of one set (activeOffers.length items)
      let oneSetWidth = 0;
      const itemsPerSet = activeOffers.length;

      for (let i = 0; i < itemsPerSet; i += 1) {
        if (items[i]) {
          oneSetWidth += items[i].offsetWidth;
        }
      }

      // Ignore sub-pixel jitter from the ResizeObserver, which would otherwise
      // shift the loop point mid-scroll and cause a visible stutter.
      if (oneSetWidth > 0 && Math.abs(setWidthRef.current - oneSetWidth) > 1) {
        setWidthRef.current = oneSetWidth;

        // Keep the offset inside the new set so the loop point stays seamless.
        if (Math.abs(offsetRef.current) >= oneSetWidth) {
          offsetRef.current %= oneSetWidth;
        }
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
  }, [activeOffers.length]);

  // Continuous animation loop - truly seamless infinite scroll.
  // Runs for the whole lifetime of the component so scrolling away and back
  // never interrupts it; the width is read from the ref each frame, so the loop
  // simply idles at offset 0 until the first measurement lands.
  useEffect(() => {
    const speed = 60; // pixels per second (adjust for speed)
    let lastTime = performance.now();

    const animate = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.016); // Cap at 60fps, convert to seconds
      lastTime = currentTime;

      const currentSetWidth = setWidthRef.current;

      if (currentSetWidth > 0) {
        // Move the offset continuously based on time
        offsetRef.current -= speed * deltaTime;

        // When we've scrolled exactly one set width, reset seamlessly.
        // This creates a perfect loop because the content is duplicated 3 times:
        // when we reset, we're showing the second set which is identical to the first.
        if (Math.abs(offsetRef.current) >= currentSetWidth) {
          offsetRef.current += currentSetWidth; // Reset by adding back one set width
        }

        // Write straight to the DOM instead of through state: a re-render per
        // frame would rebuild every offer item 60 times a second.
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return (
    <StyledMarqueeContainer visible={isVisible}>
      <StyledMarqueeWrapper>
        <StyledMarqueeTrack ref={trackRef}>
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

