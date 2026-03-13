import { yupResolver } from '@hookform/resolvers/yup';
import LoadingButton from '@mui/lab/LoadingButton';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { createAddress, deleteAddress, setPrimaryAddress, updateAddress, useGetAddresses } from 'src/api/addresses';
import { useGetProfile } from 'src/api/user';
import { useAuthContext } from 'src/auth/hooks';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import axiosInstance from 'src/utils/axios';
import * as Yup from 'yup';
import UserAddressManagementView from './user-address-management-view';

export default function UserProfileView() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { profile, isLoading, error, mutate } = useGetProfile();

  if (!user) {
    router.push(paths.auth.jwt.login);
    return null;
  }

  if (isLoading) {
    return <LoadingScreen />;
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
    setEditMode(!editMode);
    setTabValue(0);
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
                      position: 'relative',
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      bgcolor: 'primary.lighter',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {displayUser.avatar ? (
                      <Box
                        component="img"
                        src={displayUser.avatar}
                        alt="Avatar"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Iconify icon="solar:user-bold" width={60} color="primary.main" />
                    )}
                  </Box>
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
              <ProfileDisplay user={displayUser} />
            ) : (
              <>
                <Card>
                  <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label="Profile" />
                    <Tab label="Address" />
                  </Tabs>
                </Card>
                {tabValue === 0 && (
                  <ProfileEditForm
                    user={displayUser}
                    onCancel={handleEditToggle}
                    setErrorMsg={setErrorMsg}
                    setSuccessMsg={setSuccessMsg}
                    refreshProfile={mutate}
                  />
                )}
                {tabValue === 1 && (
                  <UserAddressManagementView />
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}

function ProfileDisplay({ user }) {
  const { addresses, isLoading: addressesLoading } = useGetAddresses();

  // Find primary address
  const primaryAddress = addresses?.find(addr => addr.isPrimary) || addresses?.[0];

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {user.avatar ? (
                <Box
                  component="img"
                  src={user.avatar}
                  alt="Avatar"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Iconify icon="solar:user-bold" width={40} color="primary.main" />
              )}
            </Box>
            <Stack spacing={1}>
              <Typography variant="h6">{user.fullName || 'User'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.phone || '-'}
              </Typography>
            </Stack>
          </Stack>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Profile Information
          </Typography>
          <Stack spacing={2}>
            <InfoRow label="Full Name" value={user.fullName || '-'} />
            <InfoRow label="Email" value={user.email || '-'} />
            <InfoRow label="Mobile" value={user.phone || '-'} />
          </Stack>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Primary Address
          </Typography>
          {(() => {
            if (addressesLoading) {
              return <Typography variant="body2" color="text.secondary">Loading address...</Typography>;
            }

            if (primaryAddress) {
              return (
                <Stack spacing={2}>
                  <InfoRow label="Address" value={primaryAddress.address || '-'} />
                  <InfoRow label="City" value={primaryAddress.city || '-'} />
                  <InfoRow label="State" value={primaryAddress.state || '-'} />
                  <InfoRow label="Country" value={primaryAddress.country || '-'} />
                  <InfoRow label="Zip Code" value={primaryAddress.zipCode || '-'} />
                </Stack>
              );
            }

            return (
              <Typography variant="body2" color="text.secondary">
                No address added yet
              </Typography>
            );
          })()}
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

function ProfileEditForm({ user, onCancel, setErrorMsg, setSuccessMsg, refreshProfile }) {
  const [emailVerificationStep, setEmailVerificationStep] = useState(null);
  const [emailOtpId, setEmailOtpId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '']);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const emailOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const displayUser = user;

  const ProfileSchema = Yup.object().shape({
    fullName: Yup.string().required('Full name is required'),
    email: Yup.string().email('Invalid email address'),
    phone: Yup.string(),
  });

  const methods = useForm({
    resolver: yupResolver(ProfileSchema),
    defaultValues: {
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    watch,
  } = methods;

  const emailValue = watch('email');

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatar(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendEmailOtp = async () => {
    try {
      setEmailOtpError('');
      if (!emailValue || !emailValue.includes('@')) {
        setEmailOtpError('Please enter a valid email address');
        return;
      }

      setNewEmail(emailValue);
      const response = await axiosInstance.post('/api/users/profile/email/send-otp', {
        newEmail: emailValue,
      });

      setEmailOtpId(response.data.otpId || '');
      setEmailVerificationStep('verify-otp');
      setEmailOtp(['', '', '', '']);

      setTimeout(() => {
        emailOtpRefs[0].current?.focus();
      }, 100);
    } catch (error) {
      setEmailOtpError(error.response?.data?.message || error.message || 'Failed to send OTP');
    }
  };

  const handleEmailOtpChange = (index, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newOtp = [...emailOtp];
      newOtp[index] = numericValue;
      setEmailOtp(newOtp);
      setEmailOtpError('');

      if (numericValue && index < 3) {
        emailOtpRefs[index + 1].current?.focus();
      }
    }
  };

  const handleEmailOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !emailOtp[index] && index > 0) {
      emailOtpRefs[index - 1].current?.focus();
    }
  };

  const handleEmailOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);

    if (pastedData.length === 4) {
      const newOtp = pastedData.split('');
      setEmailOtp(newOtp);
      emailOtpRefs[3].current?.focus();
      handleVerifyEmailOtp(pastedData);
    }
  };

  const handleVerifyEmailOtp = async (otpValue = emailOtp.join('')) => {
    try {
      setEmailOtpError('');
      const otp = otpValue || emailOtp.join('');

      if (otp.length !== 4) {
        return;
      }

      await axiosInstance.patch('/api/users/profile/email', {
        newEmail,
        otp,
      });

      setEmailVerificationStep(null);
      setSuccessMsg('Email verified and updated successfully!');
    } catch (error) {
      setEmailOtpError(error.response?.data?.message || error.message || 'Invalid OTP');
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');

      // Update profile data first
      const response = await axiosInstance.patch('/api/users/profile', {
        fullName: data.fullName,
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      // Upload avatar if selected
      if (selectedAvatar) {
        const formData = new FormData();
        formData.append('avatar', selectedAvatar);

        const avatarResponse = await axiosInstance.patch('/api/users/profile/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (avatarResponse.data.success) {
          setSuccessMsg('Profile and avatar updated successfully!');
        }
      } else {
        setSuccessMsg('Profile updated successfully!');
      }
      await refreshProfile();

      setTimeout(() => {
        onCancel();
      }, 1000);
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  });

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Edit Profile
        </Typography>
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            {/* Avatar Upload Section */}
            <Stack spacing={2}>
              <Typography variant="subtitle2">Profile Picture</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  }}
                  component="label"
                >
                  {avatarPreview || user.avatar ? (
                    <Box
                      component="img"
                      src={avatarPreview || user.avatar}
                      alt="Avatar"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Iconify icon="solar:camera-bold" width={30} color="primary.main" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </Box>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Click to upload a new profile picture
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recommended: Square image, at least 200x200px
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            <RHFTextField name="fullName" label="Full Name" />

            {/* Email Field with OTP Verification */}
            <Stack spacing={2}>
              <Box sx={{ position: 'relative' }}>
                <RHFTextField
                  name="email"
                  label="Email"
                  type="email"
                  InputProps={{
                    endAdornment: displayUser.isEmailVerified && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <Iconify icon="solar:check-circle-bold" color="success.main" width={24} />
                      </Box>
                    ),
                  }}
                />
              </Box>
              {emailValue && emailValue !== user.email && !displayUser.isEmailVerified && !emailVerificationStep && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSendEmailOtp}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Verify Email with OTP
                </Button>
              )}

              {emailVerificationStep === 'verify-otp' && (
                <Stack spacing={2} sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                  <Typography variant="body2">Enter OTP sent to {newEmail}</Typography>
                  {emailOtpError && <Alert severity="error">{emailOtpError}</Alert>}
                  <Stack direction="row" spacing={2} justifyContent="center">
                    {emailOtp.map((digit, index) => (
                      <TextField
                        key={index}
                        inputRef={emailOtpRefs[index]}
                        value={digit}
                        onChange={(e) => handleEmailOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleEmailOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleEmailOtpPaste : undefined}
                        inputProps={{
                          maxLength: 1,
                          style: {
                            textAlign: 'center',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            padding: '16px',
                          },
                        }}
                        sx={{
                          width: 64,
                          '& input': {
                            padding: '16px 0',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                  <Button
                    fullWidth
                    color="inherit"
                    size="large"
                    variant="contained"
                    type="button"
                    onClick={() => handleVerifyEmailOtp()}
                    disabled={emailOtp.join('').length !== 4}
                  >
                    Verify & Update Email
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setEmailVerificationStep(null)}
                  >
                    Cancel
                  </Button>
                </Stack>
              )}
            </Stack>

            {/* Mobile Number Field - Read Only */}
            <RHFTextField
              name="phone"
              label="Mobile Number"
              type="tel"
              disabled
              helperText="Mobile number cannot be changed"
              InputProps={{
                endAdornment: displayUser.isMobileVerified && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Iconify icon="solar:check-circle-bold" color="success.main" width={24} />
                  </Box>
                ),
              }}
            />

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
  refreshProfile: PropTypes.func,
};

function AddressEditForm({ user, onCancel, setErrorMsg, setSuccessMsg, refreshProfile }) {
  const { addresses, isLoading, mutate: mutateAddresses } = useGetAddresses();
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const AddressSchema = Yup.object().shape({
    address: Yup.string().required('Address is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    country: Yup.string().required('Country is required'),
    zipCode: Yup.number()
      .transform((value, originalValue) =>
        originalValue === '' ? undefined : Number(originalValue)
      )
      .typeError('Zip code must be a number')
      .required('Zip code is required')
      .positive('Zip code must be positive'),
  });

  const methods = useForm({
    resolver: yupResolver(AddressSchema),
    defaultValues: {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = methods;

  const handleSetPrimary = async (id) => {
    try {
      setErrorMsg('');
      await setPrimaryAddress(id);
      setSuccessMsg('Primary address updated!');
      await mutateAddresses();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to set primary address');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      setErrorMsg('');
      await deleteAddress(id);
      setSuccessMsg('Address deleted successfully!');
      await mutateAddresses();
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to delete address');
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  const handleDeleteClick = (address) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAddressToDelete(null);
  };

  const handleDeleteConfirm = () => {
    if (addressToDelete) {
      handleDeleteAddress(addressToDelete.id);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');

      // Convert zipCode to number
      const addressData = {
        ...data,
        zipCode: Number(data.zipCode)
      };

      if (editingId) {
        await updateAddress(editingId, addressData);
        setSuccessMsg('Address updated successfully!');
      } else {
        await createAddress(addressData);
        setSuccessMsg('Address added successfully!');
      }

      reset();
      setEditingId(null);
      await mutateAddresses();
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Manage Addresses
        </Typography>

        {/* Address List */}
        <Stack spacing={2} sx={{ mb: 4 }}>
          {addresses && addresses.length > 0 ? (
            addresses.map((addr) => (
              <Card key={addr.id} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Stack spacing={1} sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          <strong>{addr.address}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {addr.city}, {addr.state} {addr.zipCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {addr.country}
                        </Typography>
                      </Stack>
                      {addr.isPrimary && (
                        <Box sx={{ bgcolor: 'success.lighter', px: 1.5, py: 0.5, borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                            Primary
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      {!addr.isPrimary && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSetPrimary(addr.id)}
                        >
                          Set as Primary
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setEditingId(addr.id);
                          reset({
                            address: addr.address,
                            city: addr.city,
                            state: addr.state,
                            country: addr.country,
                            zipCode: addr.zipCode,
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteClick(addr)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No addresses added yet
            </Typography>
          )}
        </Stack>

        {/* Address Form */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          {editingId ? 'Edit Address' : 'Add New Address'}
        </Typography>
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
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
                <RHFTextField
                  name="zipCode"
                  label="Zip Code"
                  type="number"
                  inputMode="numeric"
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2}>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                sx={{ flex: 1 }}
              >
                {editingId ? 'Update Address' : 'Add Address'}
              </LoadingButton>
              {editingId && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditingId(null);
                    reset();
                  }}
                  sx={{ flex: 1 }}
                >
                  Cancel Edit
                </Button>
              )}
              <Button variant="outlined" onClick={onCancel} sx={{ flex: 1 }}>
                Done
              </Button>
            </Stack>
          </Stack>
        </FormProvider>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Delete Address
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Are you sure you want to delete this address?
              {addressToDelete && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>{addressToDelete.address}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {addressToDelete.city}, {addressToDelete.state} {addressToDelete.zipCode}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    {addressToDelete.country}
                  </Typography>
                </Box>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

AddressEditForm.propTypes = {
  user: PropTypes.object,
  onCancel: PropTypes.func,
  setErrorMsg: PropTypes.func,
  setSuccessMsg: PropTypes.func,
  refreshProfile: PropTypes.func,
};
