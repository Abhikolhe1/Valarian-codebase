import * as Yup from 'yup';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CardContent from '@mui/material/CardContent';
// utils
import axiosInstance from 'src/utils/axios';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export default function ProfileEditForm({ user, onCancel, setErrorMsg, setSuccessMsg, refreshProfile }) {
  const [emailVerificationStep, setEmailVerificationStep] = useState(null);
  const [emailOtpId, setEmailOtpId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '']);
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
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 4);

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

      setSuccessMsg('Profile updated successfully!');
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
              {emailValue &&
                emailValue !== user.email &&
                !emailVerificationStep && (
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
