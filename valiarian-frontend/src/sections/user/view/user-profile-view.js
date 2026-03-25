import { useEffect, useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// routes
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// api
import { useGetProfile } from 'src/api/user';
// components
import Iconify from 'src/components/iconify';
import { SplashScreen } from 'src/components/loading-screen';
//
import ProfileDisplay from './profile-display';
import ProfileEditForm from './profile-edit-form';
import AccountChangePassword from './account-change-password';
import UserAddressManagementView from './user-address-management-view';

// ----------------------------------------------------------------------

export default function UserProfileView() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('display'); // 'display', 'edit-profile', 'address', 'change-password'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showSplash, setShowSplash] = useState(true);

  const { profile, isLoading, error, mutate } = useGetProfile();

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(splashTimer);
  }, []);

  if (!user) {
    router.push(paths.auth.jwt.login);
    return null;
  }

  if (isLoading) {
    if (showSplash) {
      return <SplashScreen />;
    }

    return <UserProfileSkeleton />;
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Failed to load profile</Alert>
      </Container>
    );
  }

  const displayUser = profile || user;

  const handleEditToggle = () => {
    setViewMode(viewMode === 'edit-profile' ? 'display' : 'edit-profile');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleAddressToggle = () => {
    setViewMode(viewMode === 'address' ? 'display' : 'address');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleChangePasswordToggle = () => {
    setViewMode(viewMode === 'change-password' ? 'display' : 'change-password');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <Container maxWidth="lg">
      <Stack spacing={3} sx={{ py: 5 }}>
        <Typography variant="h3">My Profile</Typography>

        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        {successMsg && <Alert severity="success">{successMsg}</Alert>}

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Typography variant="h5">{displayUser.fullName || 'User'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {displayUser.email || displayUser.phone}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant={viewMode === 'edit-profile' ? 'contained' : 'outlined'}
                    startIcon={<Iconify icon="solar:pen-bold" />}
                    onClick={handleEditToggle}
                  >
                    {viewMode === 'edit-profile' ? 'Back to Profile' : 'Edit Profile'}
                  </Button>
                  <Button
                    fullWidth
                    variant={viewMode === 'address' ? 'contained' : 'outlined'}
                    startIcon={<Iconify icon="solar:map-point-wave-bold" />}
                    onClick={handleAddressToggle}
                  >
                    {viewMode === 'address' ? 'Back to Profile' : 'Address'}
                  </Button>
                  {/* <Button
                    fullWidth
                    variant={viewMode === 'change-password' ? 'contained' : 'outlined'}
                    startIcon={<Iconify icon="solar:lock-password-bold" />}
                    onClick={handleChangePasswordToggle}
                  >
                    {viewMode === 'change-password' ? 'Back to Profile' : 'Change Password'}
                  </Button> */}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {viewMode === 'display' && <ProfileDisplay user={displayUser} />}

            {viewMode === 'edit-profile' && (
              <ProfileEditForm
                user={displayUser}
                onCancel={() => setViewMode('display')}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
                refreshProfile={mutate}
              />
            )}

            {viewMode === 'address' && <UserAddressManagementView />}

            {viewMode === 'change-password' && (
              <AccountChangePassword
                onCancel={() => setViewMode('display')}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
              />
            )}
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}

function UserProfileSkeleton() {
  return (
    <Container maxWidth="lg">
      <Stack spacing={3} sx={{ py: 5 }}>
        <Skeleton variant="rounded" width={220} height={44} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={72} height={72} />
                  <Skeleton variant="rounded" width="70%" height={28} />
                  <Skeleton variant="rounded" width="55%" height={20} />
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={40} />
                  <Skeleton variant="rounded" height={40} />
                  <Skeleton variant="rounded" height={40} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Skeleton variant="rounded" width={180} height={28} />
                  <Skeleton variant="rounded" width="100%" height={24} />
                  <Skeleton variant="rounded" width="85%" height={24} />
                  <Skeleton variant="rounded" width="78%" height={24} />

                  <Skeleton variant="rounded" width={180} height={28} sx={{ mt: 2 }} />
                  <Skeleton variant="rounded" width="100%" height={24} />
                  <Skeleton variant="rounded" width="88%" height={24} />
                  <Skeleton variant="rounded" width="72%" height={24} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
