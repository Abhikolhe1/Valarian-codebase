import PropTypes from 'prop-types';
// @mui
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Unstable_Grid2';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

export function CheckoutSummarySkeleton() {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title={<Skeleton variant="rounded" width={160} height={28} />} />

      <CardContent>
        <Stack spacing={2}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Stack key={index} direction="row" justifyContent="space-between" alignItems="center">
              <Skeleton variant="rounded" width={120} height={18} />
              <Skeleton variant="rounded" width={80} height={18} />
            </Stack>
          ))}

          <Skeleton variant="rounded" height={56} />
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function AddressListSkeleton({ items = 2 }) {
  return (
    <Stack spacing={3}>
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2}>
              <Skeleton variant="rounded" width="45%" height={28} />
              <Skeleton variant="rounded" width="100%" height={18} />
              <Skeleton variant="rounded" width="80%" height={18} />

              <Stack direction="row" spacing={1.5}>
                <Skeleton variant="rounded" width={96} height={36} />
                <Skeleton variant="rounded" width={180} height={36} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

AddressListSkeleton.propTypes = {
  items: PropTypes.number,
};

// ----------------------------------------------------------------------

export function CheckoutCartSkeleton({ items = 3 }) {
  return (
    <Grid container spacing={3}>
      <Grid xs={12} md={8}>
        <Card sx={{ mb: 3 }}>
          <CardHeader title={<Skeleton variant="rounded" width={180} height={28} />} />

          <CardContent>
            <Stack spacing={2.5}>
              {Array.from({ length: items }).map((_, index) => (
                <Stack
                  key={index}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Skeleton variant="rounded" width={96} height={96} />
                  <Stack spacing={1.25} sx={{ flexGrow: 1, width: 1 }}>
                    <Skeleton variant="rounded" width="55%" height={22} />
                    <Skeleton variant="rounded" width="35%" height={18} />
                    <Skeleton variant="rounded" width="25%" height={18} />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Skeleton variant="rounded" width={180} height={40} />
      </Grid>

      <Grid xs={12} md={4}>
        <CheckoutSummarySkeleton />
        <Skeleton variant="rounded" height={48} />
      </Grid>
    </Grid>
  );
}

CheckoutCartSkeleton.propTypes = {
  items: PropTypes.number,
};
