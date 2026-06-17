import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// auth
import { useAuthContext } from 'src/auth/hooks';
// utils
import { resolveAuthRedirect } from 'src/utils/auth-redirect';
// components
import { Divider } from '@mui/material';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import GoogleLoginButton from './google-login-button';
import OtpVerificationModal from './otp-verification-modal';

// ----------------------------------------------------------------------

export default function JwtRegisterView() {
  const { userRegister } = useAuthContext();

  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [registrationData, setRegistrationData] = useState(null);

  const searchParams = useSearchParams();

  const returnTo = searchParams.get('returnTo');

  const RegisterSchema = Yup.object().shape({
    firstName: Yup.string().required('First name required'),
    lastName: Yup.string().required('Last name required'),
    mobile: Yup.string()
      .required('Mobile number is required')
      .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
    email: Yup.string()
      .email('Email must be a valid email address')
      .notRequired(),
  });

  const defaultValues = {
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
  };

  const methods = useForm({
    resolver: yupResolver(RegisterSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const createGeneratedPassword = () =>
    `Vali${Math.random().toString(36).slice(-6)}A1`;

  const sendOtpForRegistration = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setRegistrationData(data);

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

      setSessionId(result.sessionId);
      setOtpModalOpen(true);
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error?.error?.message);
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
      await userRegister({
        sessionId,
        fullName: `${registrationData.firstName} ${registrationData.lastName}`,
        email: registrationData.email || undefined,
        password: createGeneratedPassword(),
      });

      setOtpModalOpen(false);
      router.push(returnTo || resolveAuthRedirect(searchParams));
    } catch (error) {
      console.error(error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const handleResendOtp = async () => {
    const response = await fetch(`${process.env.REACT_APP_HOST_API}/api/auth/send-phone-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: registrationData?.mobile,
        role: 'user',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to resend OTP');
    }

    if (result.sessionId) {
      setSessionId(result.sessionId);
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
    <FormProvider methods={methods} onSubmit={sendOtpForRegistration}>
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
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={sendOtpForRegistration}
                  disabled={isSubmitting}
                >
                  Send OTP
                </Button>
              </InputAdornment>
            ),
          }}
        />

        <RHFTextField
          name="email"
          label="Email address (Optional)"
          placeholder="your@email.com"
        />

        <LoadingButton
          fullWidth
          color="inherit"
          size="large"
          type="button"
          variant="contained"
          loading={isSubmitting}
          onClick={sendOtpForRegistration}
        >
          Send OTP
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
        onResend={handleResendOtp}
        onVerified={handleOtpVerified}
      />
    </>
  );
}
