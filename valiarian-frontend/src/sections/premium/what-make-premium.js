import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const premiumFeatures = [
  {
    id: 1,
    img: '/assets/premium/ic-make-brand.png',
    title: 'Exceptional Fabric',
    description:
      "Sea Island cotton represents less than 0.0004% of global cotton production. Its rarity and quality make it the choice of the world's most discerning brands.",
  },
  {
    id: 2,
    img: '/assets/premium/ic-make-brand.png',
    title: 'Artisan Craftsmanship',
    description:
      'Hand-finished in Portugal by master tailors with over 30 years of experience. Each polo takes 6 hours to complete — 4x longer than mass-produced alternatives.',
  },
  {
    id: 3,
    img: '/assets/premium/ic-design.png',
    title: 'Engineered Fit',
    description:
      'Custom-developed pattern based on 10,000+ body scans. Tailored shoulders, tapered waist, and optimal sleeve length create a silhouette that enhances every physique.',
  },
  {
    id: 4,
    img: '/assets/premium/ic-development.png',
    title: 'Limited Production',
    description:
      'Only 150 pieces will ever be made. Each polo is individually numbered and comes with a certificate of authenticity, ensuring true exclusivity.',
  },
];

const Overlay = styled(Box)({
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(6px)',
});

export default function WhatMakesPremiumSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        backgroundImage: "url('/assets/premium/premium.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        py: 14,
        color: '#fff',
      }}
    >
      <Overlay />

      <Container sx={{ position: 'relative', zIndex: 2 }}>
        {/* Heading */}
        <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>
          What Makes It Premium
        </Typography>

        <Typography
          align="center"
          sx={{
            mt: 2,
            mb: 10,
            letterSpacing: 1,
            fontSize: 13,
            color: '#FFF5CC',
          }}
        >
          THIS ISN&apos;T JUST ANOTHER POLO. IT&apos;S A MASTERPIECE OF
          CRAFTSMANSHIP, DESIGNED TO LAST A LIFETIME.
        </Typography>

        {/* Static Cards */}
        <Grid container spacing={4} justifyContent="center">
          {premiumFeatures.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.id}>
              <Card
                sx={{
                  height: 280,
                  borderRadius: 4,
                  background: '#FFFFFF99',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center',
                  px: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <CardContent>
                  <Box component='img' src={item.img} width={36} sx={{ mb: 3 }} />

                  <Typography
                    variant="h6"
                    sx={{ mb: 2, fontWeight: 600, color: '#212B36' }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 14,
                      lineHeight: 1.2,
                      color: '#637381',
                    }}
                  >
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
