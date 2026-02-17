import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

/**
 * Section Skeleton Component
 * Displays loading skeletons for different section types
 */
export default function SectionSkeleton({ type = 'default', sx, ...other }) {
  const skeletonMap = {
    hero: <HeroSkeleton />,
    features: <FeaturesSkeleton />,
    testimonials: <TestimonialsSkeleton />,
    gallery: <GallerySkeleton />,
    cta: <CTASkeleton />,
    text: <TextSkeleton />,
    video: <VideoSkeleton />,
    faq: <FAQSkeleton />,
    team: <TeamSkeleton />,
    pricing: <PricingSkeleton />,
    contact: <ContactSkeleton />,
    custom: <DefaultSkeleton />,
    default: <DefaultSkeleton />,
  };

  const SkeletonComponent = skeletonMap[type] || skeletonMap.default;

  return (
    <Box
      sx={{
        width: '100%',
        py: { xs: 4, md: 6 },
        ...sx,
      }}
      {...other}
    >
      {SkeletonComponent}
    </Box>
  );
}

SectionSkeleton.propTypes = {
  type: PropTypes.oneOf([
    'hero',
    'features',
    'testimonials',
    'gallery',
    'cta',
    'text',
    'video',
    'faq',
    'team',
    'pricing',
    'contact',
    'custom',
    'default',
  ]),
  sx: PropTypes.object,
};

// ----------------------------------------------------------------------
// Skeleton Components for Different Section Types
// ----------------------------------------------------------------------

function HeroSkeleton() {
  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: 400, md: 600 },
        bgcolor: 'background.neutral',
      }}
    >
      <Skeleton
        variant="rectangular"
        width="100%"
        height="100%"
        animation="wave"
      />
      <Container
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Skeleton
          variant="text"
          width="80%"
          height={60}
          sx={{ mx: 'auto', mb: 2 }}
        />
        <Skeleton
          variant="text"
          width="60%"
          height={40}
          sx={{ mx: 'auto', mb: 3 }}
        />
        <Stack direction="row" spacing={2} justifyContent="center">
          <Skeleton variant="rounded" width={120} height={48} />
          <Skeleton variant="rounded" width={120} height={48} />
        </Stack>
      </Container>
    </Box>
  );
}

function FeaturesSkeleton() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" width="60%" height={30} sx={{ mx: 'auto' }} />
      </Box>
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Box sx={{ textAlign: 'center' }}>
              <Skeleton
                variant="circular"
                width={64}
                height={64}
                sx={{ mx: 'auto', mb: 2 }}
              />
              <Skeleton variant="text" width="80%" height={30} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="90%" height={20} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function TestimonialsSkeleton() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto' }} />
      </Box>
      <Grid container spacing={3}>
        {[1, 2, 3].map((item) => (
          <Grid item xs={12} md={4} key={item}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.neutral',
              }}
            >
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Skeleton variant="circular" width={56} height={56} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
              </Stack>
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="80%" height={20} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function GallerySkeleton() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto' }} />
      </Box>
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={240}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function CTASkeleton() {
  return (
    <Box
      sx={{
        bgcolor: 'background.neutral',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container>
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton variant="text" width="60%" height={60} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="text" width="80%" height={30} sx={{ mx: 'auto', mb: 4 }} />
          <Stack direction="row" spacing={2} justifyContent="center">
            <Skeleton variant="rounded" width={140} height={48} />
            <Skeleton variant="rounded" width={140} height={48} />
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

function TextSkeleton() {
  return (
    <Container maxWidth="md">
      <Skeleton variant="text" width="60%" height={50} sx={{ mb: 3 }} />
      <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="90%" height={24} sx={{ mb: 3 }} />
      <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="85%" height={24} />
    </Container>
  );
}

function VideoSkeleton() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto' }} />
      </Box>
      <Skeleton
        variant="rectangular"
        width="100%"
        height={480}
        sx={{ borderRadius: 2 }}
      />
    </Container>
  );
}

function FAQSkeleton() {
  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto' }} />
      </Box>
      <Stack spacing={2}>
        {[1, 2, 3, 4, 5].map((item) => (
          <Box
            key={item}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.neutral',
            }}
          >
            <Skeleton variant="text" width="80%" height={28} />
          </Box>
        ))}
      </Stack>
    </Container>
  );
}

function TeamSkeleton() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto' }} />
      </Box>
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Box sx={{ textAlign: 'center' }}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={280}
                sx={{ borderRadius: 2, mb: 2 }}
              />
              <Skeleton variant="text" width="70%" height={28} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="50%" height={20} sx={{ mx: 'auto' }} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function PricingSkeleton() {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" width="60%" height={30} sx={{ mx: 'auto' }} />
      </Box>
      <Grid container spacing={3}>
        {[1, 2, 3].map((item) => (
          <Grid item xs={12} md={4} key={item}>
            <Box
              sx={{
                p: 4,
                borderRadius: 2,
                bgcolor: 'background.neutral',
                textAlign: 'center',
              }}
            >
              <Skeleton variant="text" width="60%" height={32} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="text" width="80%" height={60} sx={{ mx: 'auto', mb: 3 }} />
              <Stack spacing={1} sx={{ mb: 3 }}>
                {[1, 2, 3, 4].map((feature) => (
                  <Skeleton key={feature} variant="text" width="100%" height={24} />
                ))}
              </Stack>
              <Skeleton variant="rounded" width="100%" height={48} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function ContactSkeleton() {
  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" width="60%" height={30} sx={{ mx: 'auto' }} />
      </Box>
      <Stack spacing={3}>
        <Skeleton variant="rounded" width="100%" height={56} />
        <Skeleton variant="rounded" width="100%" height={56} />
        <Skeleton variant="rounded" width="100%" height={56} />
        <Skeleton variant="rounded" width="100%" height={160} />
        <Skeleton variant="rounded" width="100%" height={48} />
      </Stack>
    </Container>
  );
}

function DefaultSkeleton() {
  return (
    <Container>
      <Skeleton variant="text" width="40%" height={50} sx={{ mb: 3 }} />
      <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2 }} />
    </Container>
  );
}
