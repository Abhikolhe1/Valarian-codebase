import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

export function HomeHeroSkeleton({ minHeight = { xs: 420, md: 620 } }) {
  return (
    <Box sx={{ position: 'relative', minHeight, bgcolor: 'grey.200' }}>
      <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0 }} />

      <Container
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          minHeight,
          py: { xs: 6, md: 10 },
        }}
      >
        <Stack spacing={2} sx={{ width: 1, maxWidth: 420 }}>
          <Skeleton variant="rounded" width={220} height={24} />
          <Skeleton variant="rounded" width="100%" height={56} />
          <Skeleton variant="rounded" width="80%" height={56} />
          <Skeleton variant="rounded" width={180} height={48} />
        </Stack>
      </Container>
    </Box>
  );
}

HomeHeroSkeleton.propTypes = {
  minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
};

// ----------------------------------------------------------------------

export function HomeSectionSkeleton({ compact = false }) {
  return (
    <Container sx={{ py: { xs: 6, md: compact ? 8 : 10 } }}>
      <Stack spacing={3}>
        <Stack spacing={1.5} alignItems="center">
          <Skeleton variant="rounded" width={220} height={40} />
          <Skeleton variant="rounded" width="100%" height={20} sx={{ maxWidth: 560 }} />
          <Skeleton variant="rounded" width="85%" height={20} sx={{ maxWidth: 460 }} />
        </Stack>

        <Skeleton
          variant="rounded"
          height={compact ? 220 : 360}
          sx={{ borderRadius: 3 }}
        />
      </Stack>
    </Container>
  );
}

HomeSectionSkeleton.propTypes = {
  compact: PropTypes.bool,
};

// ----------------------------------------------------------------------

export function HomeProductSectionSkeleton({ items = 3 }) {
  return (
    <Container sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack spacing={1.5} alignItems="center">
          <Skeleton variant="rounded" width={220} height={40} />
          <Skeleton variant="rounded" width="100%" height={20} sx={{ maxWidth: 560 }} />
          <Skeleton variant="rounded" width="85%" height={20} sx={{ maxWidth: 460 }} />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: `repeat(${Math.min(items, 3)}, 1fr)`,
            },
          }}
        >
          {Array.from({ length: items }).map((_, index) => (
            <Stack
              key={index}
              spacing={2}
              sx={{
                p: 2,
                borderRadius: 3,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Skeleton variant="rounded" height={280} />
              <Skeleton variant="rounded" width="70%" height={24} />
              <Skeleton variant="rounded" width="40%" height={20} />
            </Stack>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}

HomeProductSectionSkeleton.propTypes = {
  items: PropTypes.number,
};
