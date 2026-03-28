import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// routes
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { Alert, Card } from '@mui/material';
import { useState } from 'react';

// ----------------------------------------------------------------------

export default function JwtForgotPasswordView() {
  const { forgotPassword } = useAuthContext();
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const loginType = searchParams.get('loginType') === 'admin' ? 'admin' : 'super_admin';
  const loginPath = loginType === 'admin' ? paths.auth.jwt.adminLogin : paths.auth.jwt.login;
  const accountLabel = loginType === 'admin' ? 'admin' : 'super admin';

  const ForgotPasswordSchema = Yup.object().shape({
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
  });

  const defaultValues = {
    email: '',
  };

  const methods = useForm({
    resolver: yupResolver(ForgotPasswordSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await forgotPassword?.(data.email, loginType);

      const nextSearchParams = new URLSearchParams({
        email: data.email,
        loginType,
      }).toString();

      const href = `${paths.auth.jwt.newPassword}?${nextSearchParams}`;
      router.push(href);
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

  const renderForm = (
    <Stack spacing={3} alignItems="center">
      <RHFTextField name="email" label="Email address" />

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
      >
        Send Request
      </LoadingButton>

      <Link
        component={RouterLink}
        href={loginPath}
        color="inherit"
        variant="subtitle2"
        sx={{
          alignItems: 'center',
          display: 'inline-flex',
        }}
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
      {/* <PasswordIcon sx={{ height: 96 }} /> */}

      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant="h3" sx={{ display: 'flex', justifyContent: 'left' }}>
          Forgot your password?
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>
          Please enter the email address associated with your {accountLabel} account and we will
          send you an OTP to reset your password.
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
