import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// routes
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// config
import { PATH_AFTER_LOGIN } from 'src/config-global';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import { Box, Divider, LinearProgress } from '@mui/material';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import GoogleLoginButton from './google-login-button';
import OtpVerificationModal from './otp-verification-modal';

// ----------------------------------------------------------------------

// Password strength calculator
const calculatePasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  return strength;
};

const getPasswordStrengthColor = (strength) => {
  if (strength < 50) return 'error';
  if (strength < 75) return 'warning';
  return 'success';
};

const getPasswordStrengthLabel = (strength) => {
  if (strength === 0) return '';
  if (strength < 50) return 'Weak';
  if (strength < 75) return 'Medium';
  return 'Strong';
};

export default function JwtRegisterView() {
  const { register } = useAuthContext();

  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [registrationData, setRegistrationData] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const searchParams = useSearchParams();

  const returnTo = searchParams.get('returnTo');

  const password = useBoolean();

  const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().required('First name required'),
    lastName: Yup.string().required('Last name required'),
    mobile: Yup.string()
      .required('Mobile number is required')
      .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
    email: Yup.string()
      .email('Email must be a valid email address')
      .notRequired(),
    password: Yup.string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .matches(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: Yup.string()
      .required('Confirm password is required')
      .oneOf([Yup.ref('password')], 'Passwords must match'),
  });

  const defaultValues = {
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const methods = useForm({
    resolver: yupResolver(RegisterSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = methods;

  const watchPassword = watch('password', '');

  // Update password strength when password changes
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(watchPassword));
  }, [watchPassword]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setRegistrationData(data);

      // Send OTP to mobile (required)
      const response = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: data.mobile,
          role: 'user',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      // Store session ID and open OTP modal
      setSessionId(result.sessionId);
      setOtpModalOpen(true);

    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  const handleOtpVerified = async (otp) => {
    try {
      // Verify OTP
      const verifyResponse = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          otp,
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyResult.message || 'Invalid OTP');
      }

      // Complete registration
      const registerResponse = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          fullName: `${registrationData.firstName} ${registrationData.lastName}`,
          email: registrationData.email || undefined,
          password: registrationData.password,
        }),
      });

      const registerResult = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerResult.message || 'Registration failed');
      }

      // Auto-login: Store token and redirect
      if (registerResult.accessToken) {
        localStorage.setItem('accessToken', registerResult.accessToken);
        router.push(returnTo || PATH_AFTER_LOGIN);
      }

    } catch (error) {
      console.error(error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5, position: 'relative' }}>
      <Typography variant="h4">Get started absolutely free</Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2"> Already have an account? </Typography>

        <Link href={paths.auth.jwt.login} component={RouterLink} variant="subtitle2">
          Sign in
        </Link>
      </Stack>
    </Stack>
  );

  const renderTerms = (
    <Typography
      component="div"
      sx={{ color: 'text.secondary', mt: 2.5, typography: 'caption', textAlign: 'center' }}
    >
      {'By signing up, I agree to '}
      <Link underline="always" color="text.primary">
        Terms of Service
      </Link>
      {' and '}
      <Link underline="always" color="text.primary">
        Privacy Policy
      </Link>
      .
    </Typography>
  );

  const renderForm = (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={2.5}>
        {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        {/* Google Sign Up Button */}
        <GoogleLoginButton />

        {/* OR Divider */}
        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            OR
          </Typography>
        </Divider>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RHFTextField name="firstName" label="First name" />
          <RHFTextField name="lastName" label="Last name" />
        </Stack>

        <RHFTextField
          name="mobile"
          label="Mobile number *"
          placeholder="10 digit mobile number"
          inputProps={{ maxLength: 10 }}
        />

        <RHFTextField
          name="email"
          label="Email address (Optional)"
          placeholder="your@email.com"
        />

        <RHFTextField
          name="password"
          label="Password"
          type={password.value ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={password.onToggle} edge="end">
                  <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {watchPassword && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Password strength:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: `${getPasswordStrengthColor(passwordStrength)}.main`,
                  fontWeight: 'bold'
                }}
              >
                {getPasswordStrengthLabel(passwordStrength)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={passwordStrength}
              color={getPasswordStrengthColor(passwordStrength)}
              sx={{ height: 6, borderRadius: 1 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              Must be 8+ characters with uppercase, lowercase, and number
            </Typography>
          </Box>
        )}

        <RHFTextField
          name="confirmPassword"
          label="Confirm Password"
          type={password.value ? 'text' : 'password'}
        />

        <LoadingButton
          fullWidth
          color="inherit"
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          Create account
        </LoadingButton>
      </Stack>
    </FormProvider>
  );

  return (
    <>
      {renderHead}

      {renderForm}

      {renderTerms}

      <OtpVerificationModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        mobile={registrationData?.mobile}
        sessionId={sessionId}
        onVerified={handleOtpVerified}
      />
    </>
  );
}
