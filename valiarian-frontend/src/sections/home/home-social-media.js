// @mui
import { Grid, Stack, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import PropTypes from 'prop-types';
// components
import Image from 'src/components/image';

export default function HomeSocialMedia({ cmsData }) {
  // Use CMS data if available
  const title = cmsData?.content?.title || '@valiarianpremiumpolos';
  const instagramHandle = cmsData?.content?.instagram || 'valiarian.wear';
  const youtubeHandle = cmsData?.content?.youtube || 'valiarianwear';

  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box sx={{ py: { xs: 4, md: 5 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid item xs={12} md={12} sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" color='error.dark'>{title}</Typography>
          </Grid>
          <Grid item xs={12} md={12}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Grid item xs={12} md={6}>
                <Box
                  onClick={() => openLink(`https://www.instagram.com/${instagramHandle}`)}
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
                        onClick={() => openLink(`https://youtube.com/@${youtubeHandle}`)}
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
                        onClick={() => openLink(`https://youtube.com/@${youtubeHandle}`)}
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
                          alt="YouTube 2"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Grid item xs={6} md={6}>
                      <Box
                        onClick={() => openLink(`https://youtube.com/@${youtubeHandle}`)}
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
                          alt="YouTube 3"
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={6}>
                      <Box
                        onClick={() => openLink(`https://youtube.com/@${youtubeHandle}`)}
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
                          alt="YouTube 4"
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

HomeSocialMedia.propTypes = {
  cmsData: PropTypes.shape({
    content: PropTypes.shape({
      title: PropTypes.string,
      subtitle: PropTypes.string,
      instagram: PropTypes.string,
      youtube: PropTypes.string,
      facebook: PropTypes.string,
      twitter: PropTypes.string,
    }),
  }),
};
