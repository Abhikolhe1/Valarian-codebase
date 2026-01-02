import PropTypes from 'prop-types';
import { useEffect, useState, useMemo } from 'react';
import { useScroll, useTransform, m } from 'framer-motion';
// @mui
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
// layouts
import { HEADER } from 'src/layouts/config-layout';
// contexts
import { useMobileMenu } from 'src/contexts/mobile-menu-context';

// ----------------------------------------------------------------------

const StyledLogoContainer = styled(m.div)(({ theme }) => ({
  position: 'fixed',
  zIndex: 1300, // Above header (AppBar is 1100)
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledLogo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}));

const StyledBrandText = styled(m.span)(({ theme }) => ({
  fontFamily: '"Playfair Display", "Bodoni MT", "Bodoni 72", "Didot", "Baskerville", "Times New Roman", serif',
  fontWeight: 400,
  textTransform: 'uppercase',
  lineHeight: 1,
  userSelect: 'none',
  fontStyle: 'normal',
  display: 'inline-block',
  whiteSpace: 'nowrap',
  transition: 'color 0.3s ease',
}));

// ----------------------------------------------------------------------

export default function LogoAnimated({ onTransitionComplete, ...other }) {
  const { scrollY } = useScroll();
  const { isMenuOpen } = useMobileMenu();
  const [headerCenterY, setHeaderCenterY] = useState(HEADER.H_DESKTOP / 2);
  const [isMounted, setIsMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const LOGO_TEXT = 'VALIARIAN';
  const CHAR_COUNT = LOGO_TEXT.length + 1;
  // Average character width ratio for serif fonts (Playfair Display)
  const AVG_CHAR_WIDTH_RATIO = 0.65;


  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get header center position (vertical only - horizontal stays at 50%)
  useEffect(() => {
    const updateHeaderPosition = () => {
      const header = document.querySelector('[data-header="main"]');
      if (header) {
        const rect = header.getBoundingClientRect();
        // Center of header vertically (header top + half header height)
        setHeaderCenterY(rect.top + rect.height / 2);
      }
    };

    // Wait for DOM to be ready
    setTimeout(() => {
      updateHeaderPosition();
      setIsMounted(true);
    }, 100);

    window.addEventListener('resize', updateHeaderPosition);
    window.addEventListener('scroll', updateHeaderPosition, { passive: true });
    
    return () => {
      window.removeEventListener('resize', updateHeaderPosition);
      window.removeEventListener('scroll', updateHeaderPosition);
    };
  }, []);

  // Calculate responsive font sizes using viewport-based scaling
  // Mobile: Smaller sizes to prevent overlap with icons
  // Desktop: Larger sizes for premium feel
  // Initial font size: Large on hero section
  const initialFontSize = useMemo(() => {
    if (isMobile) {
      // On mobile, use clamp-like logic: scale based on viewport width but ensure minimum size
      // Account for header icons: search (36px) + menu (36px) + cart (36px) + profile (36px) = ~144px
      // Plus padding and spacing: ~40px
      // Available width: viewportWidth - 184px
      const availableWidth = viewportWidth - 184;
      const calculatedSize = availableWidth * 0.15;
      // Clamp between 40px (minimum) and 60px (maximum) for mobile
      return Math.max(40, Math.min(60, calculatedSize));
    }
    // Desktop: use base size with viewport scaling
    const scaleFactor = Math.min(1.2, Math.max(0.8, viewportWidth / 1920));
    const baseSize = 140 * scaleFactor;
    // Clamp between 120px and 160px for desktop
    return Math.max(120, Math.min(160, baseSize));
  }, [viewportWidth, isMobile]);

  // Position: 50% above vertical center = 25% from top (center is 50%, so 50% above = 25%)
  const initialTop = typeof window !== 'undefined' ? window.innerHeight * 0.25 : 180;

  // Final font size: Small in header, must not overlap icons
  // Mobile: Use viewport-based responsive calculation (scales proportionally like desktop)
  // Ensures logo never overlaps cart/profile icons on any screen size
  const finalFontSize = useMemo(() => {
    if (isMobile) {
      // Mobile: Calculate based on viewport width with conservative limits
      // Icons: search (36px) + cart (36px) + profile (36px) + menu (36px) = 144px
      // Spacing between icons: ~16px total
      // Container padding: ~32px total
      // Total reserved: 144px + 16px + 32px = 192px
      const reservedSpace = 192;
      const availableWidth = Math.max(100, viewportWidth - reservedSpace);
      
      // Logo should use max 22% of available space (very conservative to prevent overlap)
      // This ensures proper responsive scaling based on screen size (like desktop)
      const maxLogoWidth = availableWidth * 0.22;
      
      // Calculate font size accounting for character width and letter spacing
      // Formula: fontSize * charCount * (avgCharWidth + letterSpacing)
      const avgCharWidthWithSpacing = AVG_CHAR_WIDTH_RATIO + 0.12; // Includes letter spacing
      const calculatedSize = maxLogoWidth / (CHAR_COUNT * avgCharWidthWithSpacing);
      
      // Responsive scaling: scales with viewport width proportionally (like desktop)
      // Use viewport-based calculation: smaller screens = smaller font, larger screens = larger font
      // Minimum: 10px (readable on small phones), Maximum: 13px (safe on all mobile devices)
      // This creates smooth scaling: 320px screen ≈ 10px, 768px screen ≈ 13px
      const minSize = 10;
      const maxSize = 13;
      const viewportRatio = (viewportWidth - 320) / (768 - 320); // Normalize between 320px and 768px
      const viewportBasedSize = minSize + (maxSize - minSize) * Math.max(0, Math.min(1, viewportRatio));
      
      // Use the smaller of calculated size or viewport-based size for safety
      return Math.min(viewportBasedSize, Math.max(minSize, Math.min(maxSize, calculatedSize)));
    }
    // Desktop: Scale based on viewport (responsive)
    const scaleFactor = Math.min(1.1, Math.max(0.9, viewportWidth / 1920));
    return 30 * scaleFactor;
  }, [viewportWidth, isMobile, CHAR_COUNT]);

  // Calculate letter spacing to make text ~80% of viewport width
  // Formula: textWidth = (fontSize * avgCharWidth * charCount) + (letterSpacing * (charCount - 1))
  // We want: textWidth = viewportWidth * 0.8
  // Solving: letterSpacing = (viewportWidth * 0.8 - fontSize * avgCharWidth * charCount) / (charCount - 1)
  const calculateLetterSpacing = (fontSize, targetWidthPercent = 0.8) => {
    const targetWidth = viewportWidth * targetWidthPercent;
    const charWidth = fontSize * AVG_CHAR_WIDTH_RATIO;
    const totalCharWidth = charWidth * CHAR_COUNT;
    const letterSpacingPx = (targetWidth - totalCharWidth) / (CHAR_COUNT - 1);
    // Convert to em units (relative to font size)
    return letterSpacingPx / fontSize;
  };

  const finalLetterSpacing = isMobile ? 0.12 : 0.15; // Final letter spacing for header (em)

  // Scroll threshold for transition
  const scrollThreshold = 400;

  // Calculate initial letter spacing based on viewport width (reactive to viewport changes)
  const initialLetterSpacing = useMemo(() => {
    const targetWidth = viewportWidth * 0.9;
    const charWidth = initialFontSize * AVG_CHAR_WIDTH_RATIO;
    const totalCharWidth = charWidth * CHAR_COUNT;
    const letterSpacingPx = (targetWidth - totalCharWidth) / (CHAR_COUNT - 1);
    return letterSpacingPx / initialFontSize;
  }, [viewportWidth, initialFontSize, CHAR_COUNT]);

  // Transform values based on scroll - ONLY VERTICAL MOVEMENT
  // Font size decreases as user scrolls (works in both directions)
  const fontSize = useTransform(
    scrollY,
    [0, scrollThreshold],
    [initialFontSize, finalFontSize]
  );

  // Format fontSize with 'px' unit for CSS
  const fontSizeWithUnit = useTransform(fontSize, (size) => `${size}px`);

  // Animate letter spacing from initial (80% width) to final (header spacing)
  // Output range is calculated dynamically based on viewport width
  const letterSpacing = useTransform(
    scrollY,
    [0, scrollThreshold],
    [initialLetterSpacing, finalLetterSpacing]
  );
  
  const letterSpacingWithUnit = useTransform(letterSpacing, (spacing) => `${spacing}em`);

  // Compensate for letter-spacing's extra space after last character
  // Negative margin-right equal to half the letter-spacing to visually center the text
  const letterSpacingMargin = useTransform(letterSpacing, (spacing) => `${-spacing * 0.5}em`);

  // Logo moves straight up - no horizontal movement (works in both directions)
  const logoTop = useTransform(
    scrollY,
    [0, scrollThreshold],
    [initialTop, headerCenterY]
  );

  // Color transition: White when large (hero), Black when small (header)
  const textColor = useTransform(
    scrollY,
    [0, scrollThreshold],
    ['#FFFFFF', '#000000']
  );

  // Opacity: Smooth fade out near header to allow header logo to show
  // Fade starts at 80% of threshold for smooth transition
  const logoOpacity = useTransform(
    scrollY,
    [scrollThreshold * 0.8, scrollThreshold],
    [1, 0]
  );

  // Don't render until mounted to avoid layout shift
  if (!isMounted) {
    return null;
  }

  // Show animated logo when scrolled less than threshold
  // This allows smooth animation in both directions (scroll up and scroll down)
  const currentScroll = scrollY.get();
  if (currentScroll > scrollThreshold + 50) {
    return null; // Header logo takes over after transition completes
  }

  // Hide logo on mobile when menu is open to prevent overlap
  if (isMobile && isMenuOpen) {
    return null;
  }

  return (
    <StyledLogoContainer
      style={{
        top: logoTop,
        left: '50%',
        x: '-50%', // Center horizontally using transform
        // No y transform - position from top of text (not vertically centered)
        opacity: logoOpacity,
      }}
      {...other}
    >
      <Link component={RouterLink} href="/" sx={{ display: 'contents' }}>
        <StyledLogo>
          <StyledBrandText
            style={{
              fontSize: fontSizeWithUnit,
              color: textColor,
              letterSpacing: letterSpacingWithUnit,
              marginRight: letterSpacingMargin,
            }}
          >
            {LOGO_TEXT}
          </StyledBrandText>
          {/* Logo image commented out - using text branding instead */}
          {/* <StyledLogoImage
            src="/logo/Valarian_LOGO.png"
            alt="Valarian"
            onError={(e) => {
              // Fallback if image doesn't load
              e.target.style.display = 'none';
            }}
          /> */}
        </StyledLogo>
      </Link>
    </StyledLogoContainer>
  );
}

LogoAnimated.propTypes = {
  onTransitionComplete: PropTypes.func,
};

