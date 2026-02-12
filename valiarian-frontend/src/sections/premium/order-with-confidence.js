import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import Iconify from 'src/components/iconify';

const confidenceFeatures = [
  {
    id: 1,
    img: '/assets/premium/stack3.png',
    title: 'Secure Payments',
    description:
      'Every detail matters. From the selection of premium cotton to the final stitch, we never compromise on quality.',
  },
  {
    id: 2,
    img: '/assets/premium/stack1.png',
    title: 'Quality Guarantee',
    description:
      'We are committed to ethical production, sustainable materials, and creating garments designed to last a lifetime.',
  },
  {
    id: 3,
    img: '/assets/premium/stack.png',
    title: 'Premium Packaging',
    description:
      'We don’t follow trends. We create classic pieces that transcend seasons and remain relevant year after year.',
  },
];

export default function OrderWithConfidenceSection() {
  return (
    <Box
      sx={{
        backgroundColor: '#F5F5F5',
        py: 12,
      }}
    >
      <Container>
        {/* Heading */}
        <Typography
          variant="h4"
          align="center"
          sx={{
            fontWeight: 700,
            mb: 8,
            color: '#7A5C45', // brown tone like image
          }}
        >
          Order With Confidence
        </Typography>

        {/* Cards */}
        <Grid container spacing={6} justifyContent="center">
          {confidenceFeatures.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card
                elevation={0}
                sx={{
                  background: 'transparent',
                  textAlign: 'center',
                }}
              >
                <CardContent>
                  {/* Icon Circle */}
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
                    <Box component='img' src={item.img} icon={item.icon} />
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 2,
                      color: '#637381',
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 14,
                      color: '#919EAB',
                      lineHeight: 1.6,
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
