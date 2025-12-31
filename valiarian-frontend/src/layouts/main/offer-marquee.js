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

const StyledMarqueeTrack = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  willChange: 'transform',
  // Smooth, continuous animation - moves exactly one set (50% of duplicated content)
  // Using linear timing ensures constant speed with no acceleration/deceleration
  animation: 'marquee 50s linear infinite',
  animationFillMode: 'both', // Ensures smooth loop without reset flicker
  '@keyframes marquee': {
    '0%': {
      transform: 'translateX(0)',
    },
    '100%': {
      transform: 'translateX(-50%)', // Move exactly one set when using 2 sets
    },
  },
  [theme.breakpoints.down('sm')]: {
    animation: 'marquee 45s linear infinite',
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

  // Create seamless infinite loop by duplicating offers exactly 2x
  // When animation moves -50%, it moves exactly one set
  // When it loops back to 0%, the duplicate set seamlessly continues
  const seamlessOffers = [...OFFERS, ...OFFERS];

  return (
    <StyledMarqueeContainer visible={isVisible}>
      <StyledMarqueeWrapper>
        <StyledMarqueeTrack>
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

