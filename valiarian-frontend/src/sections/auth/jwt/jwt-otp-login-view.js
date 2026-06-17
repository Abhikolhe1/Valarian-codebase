import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// routes
import { useRouter, useSearchParams } from 'src/routes/hook';
// config
import { PATH_AFTER_LOGIN } from 'src/config-global';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import GoogleLoginButton from './google-login-button';
import OtpVerificationModal from './otp-verification-modal';

// ----------------------------------------------------------------------

export default function JwtOtpLoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [errorMsg, setErrorMsg] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [isEmail, setIsEmail] = useState(false);

  const LoginSchema = Yup.object().shape({
    identifier: Yup.string()
      .required('Email or mobile number is required')
      .test('email-or-phone', 'Must be a valid email or 10-digit mobile number', (value) => {
        if (!value) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10}$/;
        return emailRegex.test(value) || phoneRegex.test(value);
      }),
  });

  const methods = useForm({
    resolver: yupResolver(LoginSchema),
    defaultValues: {
      identifier: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      const identifierValue = data.identifier;
      const isEmailValue = identifierValue.includes('@');

      setIdentifier(identifierValue);
      setIsEmail(isEmailValue);

      // Send OTP based on identifier type
      const endpoint = isEmailValue ? '/api/auth/send-email-otp' : '/api/auth/send-phone-otp';
      const payload = isEmailValue
        ? { email: identifierValue, sessionId: 'temp' } // Email needs sessionId
        : { phone: identifierValue, role: 'user' };

      const response = await fetch(`${process.env.REACT_APP_HOST_API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringi
 : '/api/auth/verify-phone-otp';
  const verifyResponse = await fetch(`${process.env.REACT_APP_HOST_API}${verifyEndpoint}`, {
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

  // Check if user exists
  const checkUserResponse = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/check-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: isEmail ? { email: identifier } : { phone: identifier },
    }),
  });

  const checkUserResult = await checkUserResponse.json();

  if (checkUserResult.exists) {
    // User exists - login with OTP
    const loginResponse = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/user/otp-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        identifier: isEmail ? identifier : identifier,
      }),
    });

    const loginResult = await loginResponse.json();

    if (!loginResponse.ok) {
      throw new Error(loginResult.message || 'Login failed');
    }

    // Store token and redirect
    localStorage.setItem('accessToken', loginResult.accessToken);
    localStorage.setItem('user', JSON.stringify(loginResult.user));

    router.push(returnTo || PATH_AFTER_LOGIN);
  } else {
    // New user - auto register
    const registerResponse = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        fullName: identifier.split('@')[0], // Use email prefix as name for now
        email: isEmail ? identifier : undefined,
        password: Math.random().toString(36).slice(-8), // Generate random password
      }),
    });

    const registerResult = await registerResponse.json();

    if (!registerResponse.ok) {
      throw new Error(registerResult.message || 'Registration failed');
    }

    // Store token and redirect
    localStorage.setItem('accessToken', registerResult.accessToken);
    localStorage.setItem('user', JSON.stringify(registerResult.user));

    router.push(returnTo || PATH_AFTER_LOGIN);
  }

} catch (error) {
  console.error(error);
  throw error;
}
  };

return (
  <>
    <Stack spacing={2} sx={{ mb: 5 }}>
      <Typography variant="h4">Sign in to Valiarian</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Enter your email or mobile number to receive OTP
      </Typography>
    </Stack>

    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        {/* Google Login */}
        <GoogleLoginButton />

        {/* Divider */}
        <Divider>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            OR
          </Typography>
        </Divider>

        {/* Email/Phone Input */}
        <RHFTextField
          name="identifier"
          label="Email or Mobile Number"
          placeholder="Enter email or 10-digit mobile"
          helperText="We'll send you an OTP to verify"
        />

        {/* Send OTP Button */}
        <LoadingButton
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          Send OTP
        </LoadingButton>

        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Typography>
      </Stack>
    </FormProvider>

    {/* OTP Verification Modal */}
    <OtpVerificationModal
      open={otpModalOpen}
      onClose={() => setOtpModalOpen(false)}
      mobile={!isEmail ? identifier : undefined}
      email={isEmail ? identifier : undefined}
      sessionId={sessionId}
      onVerified={handleOtpVerified}
    />
  </>
);
}
