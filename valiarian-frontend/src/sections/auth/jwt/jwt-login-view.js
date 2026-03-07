import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import { Divider } from '@mui/material';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
// config
import { PATH_AFTER_LOGIN } from 'src/config-global';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// auth
import { useAuthContext } from 'src/auth/hooks';
// components
import FormProvider, { RHFCheckbox, RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import GoogleLoginButton from './google-login-button';

// ----------------------------------------------------------------------

export default function JwtLoginView() {
  const { userLogin } = useAuthContext();

  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');

  const searchParams = useSearchParams();

  const returnTo = searchParams.get('returnTo');

  const password = useBoolean();

  const LoginSchema = Yup.object().shape({
    identifier: Yup.string()
      .required('Mobile number or email is required')
      .test('mobile-or-email', 'Must be a valid mobile number (10 digits) or email address', (value) => {
        if (!value) return false;
        // Check if it's a valid mobile number (10 digits)
        const mobileRegex = /^[0-9]{10}$/;
        // Check if it's a valid email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return mobileRegex.test(value) || emailRegex.test(value);
      }),
    password: Yup.string().required('Password is required'),
    rememberMe: Yup.boolean(),
  });

  const defaultValues = {
    identifier: '',
    password: '',
    rememberMe: false,
  };

  const methods = useForm({
    resolver: yupResolver(LoginSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');

      // Use auth context's userLogin method
      await userLogin(data.identifier, data.password, data.rememberMe);

      // Redirect to return URL or default path
      router.push(returnTo || PATH_AFTER_LOGIN);

    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5 }}>
      <Typography variant="h4">Sign in to Valiarian</Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2">New user?</Typography>

        <Link component={RouterLink} href={paths.auth.jwt.register} variant="subtitle2">
          Create an account
        </Link>
      </Stack>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2.5}>
      {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      {/* Google Login Button */}
      <GoogleLoginButton />

      {/* OR Divider */}
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          OR
        </Typography>
      </Divider>

      <RHFTextField
        name="identifier"
        label="Mobile number or Email address"
        placeholder="Enter your mobile number or email"
        helperText="You can use either your 10-digit mobile number or email address"
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

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <RHFCheckbox name="rememberMe" label="Remember me" />

        <Link
          component={RouterLink}
          href={paths.auth.jwt.forgotPassword || '#'}
          variant="body2"
          color="inherit"
          underline="always"
        >
          Forgot password?
        </Link>
      </Stack>

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
      >
        Login
      </LoadingButton>
    </Stack>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      {renderHead}

      {renderForm}
    </FormProvider>
  );
}
