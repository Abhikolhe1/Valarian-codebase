// @mui
import { Grid, Stack, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
// components
import Image from 'src/components/image';

export default function HomeSocialMedia() {
  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ py: { xs: 4, md: 5 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid item xs={12} md={12} sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" color='error.dark'>@valiarianpremiumpolos</Typography>
          </Grid>
          <Grid item xs={12} md={12}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Grid item xs={12} md={6}>
                <Box
                  onClick={() => openLink('https://www.instagram.com/valiarian.wear')}
                  sx={{
                    height: { xs: 320, md: 600 },
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  <Image
                    src="/assets/images/home/social-media/social-1.jpeg"
                    alt="Instagram Main"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="column" spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <Grid item xs={6} md={6}>
                      <Box
                        onClick={() => openLink('https://youtube.com/@valiarianwear')}
                        sx={{
                          height: { xs: 150, md: 290 },
                          width: '100%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <Image
                          src="/assets/images/home/social-media/social-2.jpeg"
                          alt="YouTube 1"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={6}>
                      <Box
                        onClick={() => openLink('https://youtube.com/@valiarianwear')}
                        sx={{
                          height: { xs: 150, md: 290 },
                          width: '100%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <Image
                          src="/assets/images/home/social-media/social-3.jpeg"
                          alt="YouTube 1"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Grid item xs={6} md={6}>
                      <Box
                        onClick={() => openLink('https://youtube.com/@valiarianwear')}
                        sx={{
                          height: { xs: 150, md: 290 },
                          width: '100%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <Image
                          src="/assets/images/home/social-media/social-4.jpeg"
                          alt="YouTube 1"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={6}>
                      <Box
                        onClick={() => openLink('https://youtube.com/@valiarianwear')}
                        sx={{
                          height: { xs: 150, md: 290 },
                          width: '100%',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <Image
                          src="/assets/images/home/social-media/social-5.jpeg"
                          alt="YouTube 1"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                  </Stack>
                </Stack>
              </Grid>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
