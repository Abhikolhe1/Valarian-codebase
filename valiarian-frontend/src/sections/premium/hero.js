import { Box, Button, Chip, Container, Typography } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { color } from '@mui/system';
import Iconify from 'src/components/iconify';

// Keyframe animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 35px,
        rgba(255,255,255,.05) 35px,
        rgba(255,255,255,.05) 70px
      )
    `,
    pointerEvents: 'none',
  },
}));

const BackgroundImage = styled(Box)({
  position: 'absolute',
  top: '-10%',
  left: '-5%',
  width: '110%',
  height: '120%',
  backgroundImage:
    'url("https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1600&q=80")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transform: 'scale(1.1)',
  filter: 'brightness(0.95) contrast(1.1)',
  zIndex: 0,
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(245,245,240,0.4) 0%, rgba(245,245,240,0.8) 100%)',
  },
});

const DiagonalOverlay = styled(Box)({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '300px',
  background: 'linear-gradient(175deg, transparent 0%, #f5f5f0 40%, #f5f5f0 100%)',
  zIndex: 1,
});

const ContentWrapper = styled(Container)({
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  padding: '40px 20px',
});

const LiveChip = styled(Chip)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  color: '#d32f2f',
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.5px',
  padding: '6px 4px',
  height: 'auto',
  borderRadius: '20px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  animation: `${float} 3s ease-in-out infinite`,
  marginBottom: '20px',

  '& .MuiChip-icon': {
    color: '#000',
  },

  '& .MuiChip-label': {
    padding: '0 12px',
    color: '#d32f2f',
  },

  '&:hover': {
    backgroundColor: theme.palette.secondary.main,
    color: '#fff',
  },

  '&:hover .MuiChip-label': {
    color: '#fff',
  },

  '&:hover .MuiChip-icon': {
    color: '#fff',
  },
}));

const SignatureText = styled(Typography)({
  fontFamily: '"Playfair Display", "Georgia", serif',
  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
  fontWeight: 600,
  color: '#c17a3a',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  marginBottom: '10px',
  animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: '-5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #c17a3a, transparent)',
  },
});

const MainHeading = styled(Typography)({
  fontFamily: '"Cormorant Garamond", "Georgia", serif',
  fontSize: 'clamp(3rem, 10vw, 6.5rem)',
  fontWeight: 600,
  fontStyle: 'italic',
  color: '#1a1a1a',
  lineHeight: 1.1,
  marginBottom: '24px',
  animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
  background: 'linear-gradient(135deg, #1a1a1a 0%, #3d3d3d 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 2px 20px rgba(0,0,0,0.1)',
});

const SubtitleText = styled(Typography)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
  color: '#4a4a4a',
  maxWidth: '600px',
  margin: '0 auto 40px',
  lineHeight: 1.8,
  fontWeight: 400,
  animation: `${fadeInUp} 0.8s ease-out 0.6s both`,
  letterSpacing: '0.3px',
});

const ExploreButton = styled(Button)(({theme}) => ({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '0.95rem',
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  padding: '16px 48px',
  backgroundColor: theme.palette.secondary.main,
  color: '#ffffff',
  borderRadius: '4px',
  boxShadow: '0 8px 24px rgba(44, 62, 80, 0.3)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${fadeInUp} 0.8s ease-out 0.8s both`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover': {
    backgroundColor: theme.palette.secondary.main,
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(44, 62, 80, 0.4)',
    '&::before': {
      left: '100%',
    },
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const DecorativeLine = styled(Box)({
  position: 'absolute',
  top: '20%',
  left: '10%',
  width: '200px',
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(193, 122, 58, 0.3), transparent)',
  transform: 'rotate(-15deg)',
  animation: `${fadeInUp} 1s ease-out 1s both`,
  display: 'none',
  '@media (min-width: 768px)': {
    display: 'block',
  },
});

const DecorativeLineRight = styled(Box)({
  position: 'absolute',
  bottom: '25%',
  right: '12%',
  width: '180px',
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(193, 122, 58, 0.3), transparent)',
  transform: 'rotate(20deg)',
  animation: `${fadeInUp} 1s ease-out 1.2s both`,
  display: 'none',
  '@media (min-width: 768px)': {
    display: 'block',
  },
});

const SignatureHero = () => (
  <HeroSection>
    {/* Background Image */}
    <BackgroundImage />

    {/* Decorative Elements */}
    <DecorativeLine />
    <DecorativeLineRight />

    {/* Content */}
    <ContentWrapper maxWidth="lg">
      <LiveChip
        icon={<Iconify icon="solar:bolt-bold" width={18} />}
        label="DROP LIVE NOW"
      />

      <SignatureText>Signature Edition</SignatureText>

      <MainHeading>Once in a Lifetime.</MainHeading>

      <SubtitleText>
        Handcrafted in Portugal using the world&apos;s finest Sea Island cotton. Only
        <br />
        150 pieces available.
      </SubtitleText>

      <ExploreButton variant="contained"  disableElevation>
        Explore Details
      </ExploreButton>
    </ContentWrapper>

    {/* Diagonal Bottom Overlay */}
    <DiagonalOverlay />
  </HeroSection>
);

export default SignatureHero;
