import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

const DEFAULT_CONTENT = {
  heading: 'Order With Confidence',
  background: '#F5F5F5',
  items: [],
};

export default function PremiumConfidenceSection({ section }) {
  const content = { ...DEFAULT_CONTENT, ...(section?.content || {}) };

  return (
    <Box sx={{ backgroundColor: content.background, py: 12 }}>
      <Container>
        <Typography variant="h4" align="center" sx={{ fontWeight: 700, mb: 8, color: '#7A5C45' }}>
          {content.heading}
        </Typography>

        <Grid container spacing={6} justifyContent="center">
          {(content.items || []).map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={`${item.title}-${index}`}>
              <Card elevation={0} sx={{ background: 'transparent', textAlign: 'center' }}>
                <CardContent>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      backgroundColor: '#ECECEC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    {item.image && <Box component="img" src={item.image} sx={{ width: 28, height: 28, objectFit: 'contain' }} />}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#637381' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#919EAB', lineHeight: 1.6 }}>
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

PremiumConfidenceSection.propTypes = {
  section: PropTypes.shape({
    content: PropTypes.object,
  }),
};
