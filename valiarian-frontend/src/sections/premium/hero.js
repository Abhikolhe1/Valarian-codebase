import { Box, Button, Chip, Container, Typography } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import Iconify from 'src/components/iconify';

/* =========================
   Animations
========================= */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

/* =========================
   Layout
========================= */

const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',

  // 🔥 Background moved here (cleaner)
  backgroundImage: `url(/assets/premium/premium-hero.png)`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',

  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(245,245,240,0.6) 0%, rgba(245,245,240,0.9) 100%)',
  },
}));

const ContentWrapper = styled(Container)({
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  padding: '60px 20px',
});

/* =========================
   Components
========================= */

const LiveChip = styled(Chip)({
  backgroundColor: 'rgba(255,255,255,0.95)',
  color: '#d32f2f',
  fontWeight: 600,
  animation: `${float} 3s ease-in-out infinite`,
  marginBottom: 24,
});

const SignatureText = styled(Typography)({
  fontFamily: '"Playfair Display", serif',
  fontSize: 'clamp(2rem, 5vw, 3.2rem)',
  fontWeight: 600,
  color: '#c17a3a',
  textTransform: 'uppercase',
  marginBottom: 12,
  animation: `${fadeInUp} 0.8s ease-out both`,
});

const MainHeading = styled(Typography)({
  fontFamily: '"Cormorant Garamond", serif',
  fontSize: 'clamp(3rem, 10vw, 6rem)',
  fontStyle: 'italic',
  fontWeight: 600,
  marginBottom: 24,
  animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
  background: 'linear-gradient(135deg, #1a1a1a, #3d3d3d)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
});

const SubtitleText = styled(Typography)({
  fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
  maxWidth: 600,
  margin: '0 auto 40px',
  lineHeight: 1.7,
  color: '#4a4a4a',
  animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
});

const ExploreButton = styled(Button)({
  padding: '14px 42px',
  fontWeight: 600,
  letterSpacing: 1,
  backgroundColor: '#2c3e50',
  color: '#fff',
  boxShadow: '0 8px 24px rgba(44, 62, 80, 0.3)',
  transition: 'all .3s ease',

  '&:hover': {
    backgroundColor: '#34495e',
    transform: 'translateY(-2px)',
  },
});

/* =========================
   Component
========================= */

export default function SignatureHero (){
  return (
    <HeroSection>
      <ContentWrapper maxWidth="lg">
        <LiveChip
          icon={<Iconify icon="solar:bolt-bold" width={18} />}
          label="DROP LIVE NOW"
        />

        <SignatureText>Signature Edition</SignatureText>

        <MainHeading>Once in a Lifetime.</MainHeading>

        <SubtitleText>
          Handcrafted in Portugal using the world’s finest Sea Island cotton.
          Only 150 pieces available.
        </SubtitleText>

        <ExploreButton variant="contained" disableElevation>
          Explore Details
        </ExploreButton>
      </ContentWrapper>
    </HeroSection>
  );
};
