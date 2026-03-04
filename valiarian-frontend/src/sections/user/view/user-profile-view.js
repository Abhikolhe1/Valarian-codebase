import { yupResolver } from '@hookform/resolvers/yup';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthContext } from 'src/auth/hooks';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import * as Yup from 'yup';

export default function UserProfileView() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!user) {
    router.push(paths.auth.jwt.login);
    return null;
  }

  const handleEditToggle = () => {
    setEditMode(!editMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleChangePassword = () => {
    router.push(paths.auth.jwt.forgotPassword);
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
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      bgcolor: 'primary.lighter',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify icon="solar:user-bold" width={60} color="primary.main" />
                  </Box>
                  <Typography variant="h5">{user.fullName || 'User'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email || user.phone}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Iconify icon="solar:pen-bold" />}
                    onClick={handleEditToggle}
                  >
                    {editMode ? 'Cancel Edit' : 'Edit Profile'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Iconify icon="solar:lock-password-bold" />}
                    onClick={handleChangePassword}
                  >
                    Change Password
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {!editMode ? (
              <ProfileDisplay user={user} />
            ) : (
              <ProfileEditForm
                user={user}
                onCancel={handleEditToggle}
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

function ProfileDisplay({ user }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Profile Information
        </Typography>
        <Stack spacing={2}>
          <InfoRow label="Full Name" value={user.fullName || '-'} />
          <InfoRow label="Email" value={user.email || '-'} />
          <InfoRow label="Mobile" value={user.phone || '-'} />
          <InfoRow label="Address" value={user.address || '-'} />
          <InfoRow label="City" value={user.city || '-'} />
          <InfoRow label="State" value={user.state || '-'} />
          <InfoRow label="Country" value={user.country || '-'} />
          <InfoRow label="Zip Code" value={user.zipCode || '-'} />
        </Stack>
      </CardContent>
    </Card>
  );
}

ProfileDisplay.propTypes = {
  user: PropTypes.object,
};

function InfoRow({ label, value }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
        {label}:
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};

function ProfileEditForm({ user, onCancel, setErrorMsg, setSuccessMsg }) {
  const ProfileSchema = Yup.object().shape({
    fullName: Yup.string().required('Full name is required'),
    address: Yup.string(),
    city: Yup.string(),
    state: Yup.string(),
    country: Yup.string(),
    zipCode: Yup.string(),
  });

  const methods = useForm({
    resolver: yupResolver(ProfileSchema),
    defaultValues: {
      fullName: user.fullName || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || '',
      zipCode: user.zipCode || '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');

      const token = sessionStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3035/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      setSuccessMsg('Profile updated successfully!');

      // Update user data in session
      const updatedUser = { ...user, ...data };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));

      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Edit Profile
        </Typography>
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <RHFTextField name="fullName" label="Full Name" />
            <RHFTextField name="address" label="Address" multiline rows={2} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="city" label="City" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="state" label="State" />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="country" label="Country" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="zipCode" label="Zip Code" />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2}>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                sx={{ flex: 1 }}
              >
                Save Changes
              </LoadingButton>
              <Button variant="outlined" onClick={onCancel} sx={{ flex: 1 }}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

ProfileEditForm.propTypes = {
  user: PropTypes.object,
  onCancel: PropTypes.func,
  setErrorMsg: PropTypes.func,
  setSuccessMsg: PropTypes.func,
};

