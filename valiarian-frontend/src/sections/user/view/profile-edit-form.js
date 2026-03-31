import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// utils
import axiosInstance from 'src/utils/axios';
import { useAuthContext } from 'src/auth/hooks';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function ProfileEditForm({
  user,
  onCancel,
  setErrorMsg,
  setSuccessMsg,
  refreshProfile,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { refreshUser } = useAuthContext();

  const [emailVerificationStep, setEmailVerificationStep] = useState(null);
  const [emailOtpId, setEmailOtpId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '']);
  const emailOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [mobileVerificationStep, setMobileVerificationStep] = useState(null);
  const [mobileOtpId, setMobileOtpId] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [isSendingMobileOtp, setIsSendingMobileOtp] = useState(false);
  const [isVerifyingMobileOtp, setIsVerifyingMobileOtp] = useState(false);
  const [mobileOtpError, setMobileOtpError] = useState('');
  const [mobileOtp, setMobileOtp] = useState(['', '', '', '']);
  const mobileOtpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const displayUser = user;
  const isEmailLogin = user.authProvider === 'local' || user.authProvider === 'google';
  const isMobileLogin = user.authProvider === 'otp' || (user.phone && !user.email);

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
    setValue,
    reset,
    formState: { isSubmitting },
    watch,
  } = methods;

  const emailValue = watch('email');
  const phoneValue = watch('phone');

  const handlePhoneChange = (event) => {
    const { value } = event.target;
    const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    setValue('phone', sanitizedValue, { shouldValidate: true });
  };

  // Email Verification Handlers
  const handleSendEmailOtp = async () => {
    try {
      setIsSendingEmailOtp(true);
      setEmailOtpError('');
      if (!emailValue || !emailValue.includes('@')) {
        const error = 'Please enter a valid email address';
        setEmailOtpError(error);
        enqueueSnackbar(error, { variant: 'error' });
        return;
      }

      setNewEmail(emailValue);
      const response = await axiosInstance.post('/api/users/profile/email/send-otp', {
        newEmail: emailValue,
      });

      const message = response.data.message || 'OTP sent to your email';
      setEmailOtpId(response.data.otpId || '');
      setEmailVerificationStep('verify-otp');
      setEmailOtp(['', '', '', '']);

      enqueueSnackbar(message);

      setTimeout(() => {
        emailOtpRefs[0].current?.focus();
      }, 100);
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Something went wrong';
      setEmailOtpError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleResetEmailFlow = () => {
    setEmailVerificationStep(null);
    setEmailOtpError('');
    setEmailOtp(['', '', '', '']);
    setNewEmail('');
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
      setIsVerifyingEmailOtp(true);
      setEmailOtpError('');
      const otp = otpValue || emailOtp.join('');

      if (otp.length !== 4) {
        return;
      }

      const response = await axiosInstance.patch('/api/users/profile/email', {
        newEmail,
        otp,
      });

      const message = response.data.message || 'Email verified and updated successfully!';
      setEmailVerificationStep(null);
      enqueueSnackbar(message);
      await refreshProfile();
      await refreshUser();
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Something went wrong';
      setEmailOtpError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Mobile Verification Handlers
  const handleSendMobileOtp = async () => {
    try {
      setIsSendingMobileOtp(true);
      setMobileOtpError('');
      if (!phoneValue || phoneValue.length < 10) {
        const error = 'Please enter a valid mobile number';
        setMobileOtpError(error);
        enqueueSnackbar(error, { variant: 'error' });
        return;
      }

      setNewMobile(phoneValue);
      const response = await axiosInstance.post('/api/users/profile/mobile/send-otp', {
        newMobile: phoneValue,
      });

      const message = response.data.message || 'OTP sent to your mobile number';
      setMobileOtpId(response.data.otpId || '');
      setMobileVerificationStep('verify-otp');
      setMobileOtp(['', '', '', '']);

      enqueueSnackbar(message);

      setTimeout(() => {
        mobileOtpRefs[0].current?.focus();
      }, 100);
      reset({
        fullName: user.fullName,
        email: user.email,
        phone: newMobile, // ✅ IMPORTANT
      });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Something went wrong';
      setMobileOtpError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsSendingMobileOtp(false);
    }
  };

  const handleResetMobileFlow = () => {
    setMobileVerificationStep(null);
    setMobileOtpError('');
    setMobileOtp(['', '', '', '']);
    setNewMobile('');
  };

  const handleMobileOtpChange = (index, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newOtp = [...mobileOtp];
      newOtp[index] = numericValue;
      setMobileOtp(newOtp);
      setMobileOtpError('');

      if (numericValue && index < 3) {
        mobileOtpRefs[index + 1].current?.focus();
      }
    }
  };

  const handleMobileOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !mobileOtp[index] && index > 0) {
      mobileOtpRefs[index - 1].current?.focus();
    }
  };

  const handleMobileOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 4);

    if (pastedData.length === 4) {
      const newOtp = pastedData.split('');
      setMobileOtp(newOtp);
      mobileOtpRefs[3].current?.focus();
      handleVerifyMobileOtp(pastedData);
    }
  };

  const handleVerifyMobileOtp = async (otpValue = mobileOtp.join('')) => {
    try {
      setIsVerifyingMobileOtp(true);
      setMobileOtpError('');
      const otp = otpValue || mobileOtp.join('');

      if (otp.length !== 4) {
        return;
      }

      const response = await axiosInstance.patch('/api/users/profile/mobile', {
        newMobile,
        otp,
      });

      const message = response.data.message || 'Mobile number verified successfully!';

      setMobileVerificationStep(null);

      // ✅ update form instantly
      setValue('phone', newMobile, { shouldValidate: true });

      // ✅ optional but best
      reset({
        ...methods.getValues(),
        phone: newMobile,
      });

      enqueueSnackbar(message, { variant: 'success' });

      await refreshProfile();
      await refreshUser();
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Something went wrong';
      setMobileOtpError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsVerifyingMobileOtp(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');

      // Update profile data first
      await axiosInstance.patch('/api/users/profile', {
        fullName: data.fullName,
      });

      const message = 'Profile updated successfully!';
      setSuccessMsg(message);
      enqueueSnackbar(message, { variant: 'success' });

      await refreshProfile();
      await refreshUser();

      setTimeout(() => {
        onCancel();
      }, 1000);
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error.message ||
        'Something went wrong';
      console.error(error);
      setErrorMsg(message);
      enqueueSnackbar(message, { variant: 'error' });
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
                  disabled={
                    (displayUser.isEmailVerified && isEmailLogin) ||
                    emailVerificationStep === 'verify-otp'
                  }
                  InputProps={{
                    endAdornment: displayUser.isEmailVerified && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <Iconify icon="solar:check-circle-bold" color="success.main" width={24} />
                      </Box>
                    ),
                  }}
                />
              </Box>
              {emailValue && emailValue !== user.email && !emailVerificationStep && (
                <LoadingButton
                  variant="outlined"
                  size="small"
                  loading={isSendingEmailOtp}
                  onClick={handleSendEmailOtp}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Verify Email with OTP
                </LoadingButton>
              )}

              {emailVerificationStep === 'verify-otp' && (
                <Stack spacing={2} sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Enter OTP sent to {newEmail}</Typography>
                    <Button size="small" color="primary" onClick={handleResetEmailFlow}>
                      Change Email
                    </Button>
                  </Stack>
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
                  <LoadingButton
                    fullWidth
                    color="inherit"
                    size="large"
                    variant="contained"
                    type="button"
                    loading={isVerifyingEmailOtp}
                    onClick={() => handleVerifyEmailOtp()}
                    disabled={emailOtp.join('').length !== 4}
                  >
                    Verify & Update Email
                  </LoadingButton>
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

            {/* Mobile Number Field */}
            <Stack spacing={2}>
              <Box sx={{ position: 'relative' }}>
                <RHFTextField
                  name="phone"
                  label="Mobile Number"
                  type="tel"
                  onChange={handlePhoneChange}
                  disabled={
                    (displayUser.isMobileVerified && !isEmailLogin) ||
                    mobileVerificationStep === 'verify-otp'
                  }
                  helperText={
                    displayUser.isMobileVerified
                      ? 'Mobile number verified'
                      : 'Enter 10 digit mobile number to verify'
                  }
                  InputProps={{
                    endAdornment: displayUser.isMobileVerified && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <Iconify icon="solar:check-circle-bold" color="success.main" width={24} />
                      </Box>
                    ),
                  }}
                />
              </Box>
              {phoneValue &&
                phoneValue.length === 10 &&
                phoneValue !== user.phone &&
                !mobileVerificationStep && (
                  <LoadingButton
                    variant="outlined"
                    color='secondary'
                    size="small"
                    loading={isSendingMobileOtp}
                    onClick={handleSendMobileOtp}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Verify Mobile with OTP
                  </LoadingButton>
                )}

              {mobileVerificationStep === 'verify-otp' && (
                <Stack spacing={2} sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Enter OTP sent to {newMobile}</Typography>
                    <Button size="small" color="primary" onClick={handleResetMobileFlow}>
                      Change Number
                    </Button>
                  </Stack>
                  {mobileOtpError && <Alert severity="error">{mobileOtpError}</Alert>}
                  <Stack direction="row" spacing={2} justifyContent="center">
                    {mobileOtp.map((digit, index) => (
                      <TextField
                        key={index}
                        inputRef={mobileOtpRefs[index]}
                        value={digit}
                        onChange={(e) => handleMobileOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleMobileOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleMobileOtpPaste : undefined}
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
                  <LoadingButton
                    fullWidth
                    color="secondary"
                    size="large"
                    variant="contained"
                    type="button"
                    loading={isVerifyingMobileOtp}
                    onClick={() => handleVerifyMobileOtp()}
                    disabled={mobileOtp.join('').length !== 4}
                  >
                    Verify & Update Mobile
                  </LoadingButton>
                  <Button
                    fullWidth
                    color='secondary'
                    variant="outlined"
                    onClick={() => setMobileVerificationStep(null)}
                  >
                    Cancel
                  </Button>
                </Stack>
              )}
            </Stack>

            <Stack direction="row" spacing={2}>
              <LoadingButton
                type="submit"
                color='secondary'
                variant="contained"
                loading={isSubmitting}
                sx={{ flex: 1 }}
              >
                Save Changes
              </LoadingButton>
              <Button variant="outlined" color='secondary' onClick={onCancel} sx={{ flex: 1 }}>
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
