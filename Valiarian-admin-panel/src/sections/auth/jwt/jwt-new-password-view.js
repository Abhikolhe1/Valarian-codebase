import * as Yup from 'yup';
import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { Alert, Card, Grid, TextField } from '@mui/material';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hook';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useCountdownSeconds } from 'src/hooks/use-countdown';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

export default function JwtNewPasswordView() {
  const { newPassword, forgotPassword } = useAuthContext();
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const loginType = searchParams.get('loginType') === 'admin' ? 'admin' : 'super_admin';
  const loginPath = loginType === 'admin' ? paths.auth.jwt.adminLogin : paths.auth.jwt.login;
  const accountLabel = loginType === 'admin' ? 'admin' : 'super admin';

  const password = useBoolean();
  const { countdown, counting, startCountdown } = useCountdownSeconds(60);

  const [otp, setOtp] = useState(Array(4).fill(''));
  const otpRefs = useRef([]);

  const VerifySchema = Yup.object().shape({
    email: Yup.string().required('Email is required').email('Email must be valid'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required(),
    confirmPassword: Yup.string()
      .required('Confirm password is required')
      .oneOf([Yup.ref('password')], 'Passwords must match'),
  });

  const defaultValues = {
    email: email || '',
    password: '',
    confirmPassword: '',
  };

  const methods = useForm({
    resolver: yupResolver(VerifySchema),
    defaultValues,
  });

  const {
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const handleOtpChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const updated = [...otp];
      updated[index] = value;
      setOtp(updated);

      if (value && index < 3) otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (index) => {
    if (index > 0 && !otp[index]) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== 4) {
      alert('Please enter 4-digit OTP');
      return;
    }

    try {
      await newPassword?.(data.email, enteredOtp, data.password, loginType);
      router.push(loginPath);
    } catch (error) {
      console.error(error);
      const message =
        typeof error === 'string'
          ? error
          : error?.error?.message || error?.message || 'Login failed';

      if (message.toLowerCase().includes('email')) {
        setErrorMsg('Email address not found');
      } else if (message.toLowerCase().includes('password')) {
        setErrorMsg('Incorrect password');
      } else {
        setErrorMsg(message);
      }
    }
  });

  const handleResendCode = useCallback(async () => {
    try {
      startCountdown();
      await forgotPassword?.(values.email, loginType);
      setOtp(Array(4).fill(''));
      otpRefs.current[0]?.focus();
    } catch (error) {
      console.error(error);
    }
  }, [forgotPassword, loginType, startCountdown, values.email]);

  const renderOtpBoxes = (
    <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
      {otp.map((digit, i) => (
        <Grid item xs={3} key={i}>
          <TextField
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') handleOtpBackspace(i);
            }}
            inputRef={(el) => {
              otpRefs.current[i] = el;
            }}
            inputProps={{
              maxLength: 1,
              style: {
                textAlign: 'center',
                fontSize: '1.5rem',
              },
            }}
          />
        </Grid>
      ))}
    </Grid>
  );

  const renderForm = (
    <Stack spacing={3} alignItems="center">
      <RHFTextField name="email" label="Email" InputLabelProps={{ shrink: true }} />

      {renderOtpBoxes}

      <Typography variant="body2">
        {counting ? (
          <>Resend OTP in ({countdown}s)</>
        ) : (
          <>
            Didn&apos;t get the OTP?{' '}
            <Link variant="subtitle2" onClick={handleResendCode} sx={{ cursor: 'pointer' }}>
              Resend
            </Link>
          </>
        )}
      </Typography>

      <RHFTextField
        name="password"
        label="New Password"
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

      <RHFTextField
        name="confirmPassword"
        label="Confirm New Password"
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

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
      >
        Update Password
      </LoadingButton>

      <Link
        component={RouterLink}
        href={loginPath}
        variant="subtitle2"
        sx={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <Iconify icon="eva:arrow-ios-back-fill" width={16} />
        Return to sign in
      </Link>
    </Stack>
  );

  const renderHead = (
    <>
      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}
      {/* <SentIcon sx={{ height: 96 }} /> */}
      <Stack spacing={1} sx={{ my: 5 }}>
        <Typography variant="h3" textAlign="left">
          Verification Code Sent
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>
          We have sent a verification code to your {accountLabel} email.
          <br />
          Please enter the code below.
        </Typography>
      </Stack>
    </>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
        {renderHead}
        {renderForm}
      </Card>
    </FormProvider>
  );
}
