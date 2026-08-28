// @mui
import { Grid, Stack, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import PropTypes from 'prop-types';
// components
import Image from 'src/components/image';

const MAX_GALLERY_ITEMS = 5;

const DEFAULT_GALLERY_IMAGES = [
  '/assets/images/home/social-media/social-1.jpeg',
  '/assets/images/home/social-media/social-2.jpeg',
  '/assets/images/home/social-media/social-3.jpeg',
  '/assets/images/home/social-media/social-4.jpeg',
  '/assets/images/home/social-media/social-5.jpeg',
];

// Older saved sections stored plain URL strings; newer ones store {image, logo, link}.
const normalizeGalleryItem = (item) => {
  if (typeof item === 'string') {
    return { image: item, logo: '', link: '' };
  }

  return {
    image: item?.image || '',
    logo: item?.logo || '',
    link: item?.link || '',
  };
};

const openLink = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

function GalleryTile({ item, height, alt, fallbackLink, logoOpacity }) {
  const link = item.link || fallbackLink;

  return (
    <Box
      onClick={link ? () => openLink(link) : undefined}
      sx={{
        position: 'relative',
        height,
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: link ? 'pointer' : 'default',
      }}
    >
      <Image
        src={item.image}
        alt={alt}
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {item.logo && (
        <Box
          component="img"
          src={item.logo}
          alt=""
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '42%', md: '35%' },
            maxWidth: 200,
            opacity: logoOpacity,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.28))',
          }}
        />
      )}
    </Box>
  );
}

GalleryTile.propTypes = {
  item: PropTypes.shape({
    image: PropTypes.string,
    logo: PropTypes.string,
    link: PropTypes.string,
  }),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  alt: PropTypes.string,
  fallbackLink: PropTypes.string,
  logoOpacity: PropTypes.number,
};

export default function HomeSocialMedia({ cmsData }) {
  const title = cmsData?.content?.title || '@valiarianpremiumpolos';
  const instagramHandle = cmsData?.content?.instagram || 'valiarian.wear';
  const youtubeHandle = cmsData?.content?.youtube || 'valiarianwear';

  const rawItems = cmsData?.content?.galleryImages?.length
    ? cmsData.content.galleryImages
    : DEFAULT_GALLERY_IMAGES;

  const items = rawItems.slice(0, MAX_GALLERY_ITEMS).map(normalizeGalleryItem);

  const logoOpacity =
    typeof cmsData?.settings?.logoOpacity === 'number' ? cmsData.settings.logoOpacity : 0.45;

  const instagramUrl = `https://www.instagram.com/${instagramHandle}`;
  const youtubeUrl = `https://youtube.com/@${youtubeHandle}`;

  const tileAt = (index) => items[index] || items[0] || { image: '', logo: '', link: '' };

  const smallTileHeight = { xs: 150, md: 290 };

  return (
    <Box sx={{ py: { xs: 4, md: 5 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          <Grid item xs={12} md={12} sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" color="error.dark">
              {title}
            </Typography>
          </Grid>
          <Grid item xs={12} md={12}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Grid item xs={12} md={6}>
                <GalleryTile
                  item={tileAt(0)}
                  height={{ xs: 320, md: 600 }}
                  alt="Instagram Main"
                  fallbackLink={instagramUrl}
                  logoOpacity={logoOpacity}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="column" spacing={2}>
                  <Stack direction="row" spacing={2}>
                    {[1, 2].map((index) => (
                      <Grid item xs={6} md={6} key={index}>
                        <GalleryTile
                          item={tileAt(index)}
                          height={smallTileHeight}
                          alt={`Gallery ${index}`}
                          fallbackLink={youtubeUrl}
                          logoOpacity={logoOpacity}
                        />
                      </Grid>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    {[3, 4].map((index) => (
                      <Grid item xs={6} md={6} key={index}>
                        <GalleryTile
                          item={tileAt(index)}
                          height={smallTileHeight}
                          alt={`Gallery ${index}`}
                          fallbackLink={youtubeUrl}
                          logoOpacity={logoOpacity}
                        />
                      </Grid>
                    ))}
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
      galleryImages: PropTypes.array,
      facebook: PropTypes.string,
      twitter: PropTypes.string,
    }),
    settings: PropTypes.shape({
      logoOpacity: PropTypes.number,
    }),
  }),
};
