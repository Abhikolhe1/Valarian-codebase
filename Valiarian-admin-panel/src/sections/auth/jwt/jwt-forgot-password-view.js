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
// assets
import { PasswordIcon } from 'src/assets/icons';
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
      await forgotPassword?.(data.email);

      const searchParams = new URLSearchParams({ email: data.email }).toString();

      const href = `${paths.auth.jwt.newPassword}?${searchParams}`;
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
        href={paths.auth.jwt.login}
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
          Please enter the email address associated with your account and We will email you a link
          to reset your password.
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
