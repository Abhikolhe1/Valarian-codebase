import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

const DEFAULT_CONTENT = {
  heading: 'What Makes It Premium',
  subheading: "This isn't just another polo. It's a masterpiece of craftsmanship.",
  backgroundImage: '/assets/premium/premium.png',
  overlayOpacity: 0.65,
  items: [],
};

export default function PremiumFeatureGridSection({ section }) {
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundImage: `url(${content.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        py: 14,
        color: '#fff',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `rgba(0,0,0,${content.overlayOpacity})`,
          backdropFilter: 'blur(6px)',
        }}
      />

      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="h3" align="center" sx={{ fontWeight: 700 }}>
          {content.heading}
        </Typography>
        <Typography align="center" sx={{ mt: 2, mb: 10, letterSpacing: 1, fontSize: 13, color: '#FFF5CC', textTransform: 'uppercase' }}>
          {content.subheading}
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {(content.items || []).map((item, index) => (
            <Grid item xs={12} sm={6} md={3} key={`${item.title}-${index}`}>
              <Card
                sx={{
                  height: 1,
                  borderRadius: 4,
                  background: '#FFFFFF99',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  textAlign: 'center',
                  px: 2,
                }}
              >
                <CardContent>
                  {item.image && <Box component="img" src={item.image} width={36} sx={{ mb: 3 }} />}
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#212B36' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: 14, lineHeight: 1.4, color: '#637381' }}>
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

PremiumFeatureGridSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
