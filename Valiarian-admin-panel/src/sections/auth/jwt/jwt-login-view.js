import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
// routes
import { paths } from 'src/routes/paths';
import { useSearchParams, useRouter } from 'src/routes/hook';
// config
import { PATH_AFTER_LOGIN } from 'src/config-global';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// auth
import { useAuthContext } from 'src/auth/hooks';
import { getDefaultDashboardPath } from 'src/auth/utils/role';
// components
import Iconify from 'src/components/iconify';
import FormProvider, { RHFCheckbox, RHFTextField } from 'src/components/hook-form';
import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

export default function JwtLoginView({ loginType = 'super_admin' }) {
  const { login } = useAuthContext();

  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');

  const searchParams = useSearchParams();

  const returnTo = searchParams.get('returnTo');
  const isAdminLogin = loginType === 'admin';

  const password = useBoolean();

  const LoginSchema = Yup.object().shape({
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
    password: Yup.string().required('Password is required'),
    rememberMe: Yup.boolean(),
  });

  const defaultValues = {
    email: '',
    password: '',
    rememberMe: true,
  };

  const methods = useForm({
    resolver: yupResolver(LoginSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const user = await login?.(data.email, data.password, data.rememberMe, loginType);

      router.push(returnTo || getDefaultDashboardPath(user) || PATH_AFTER_LOGIN);
    } catch (error) {
      console.error(error);
      const message =
        typeof error === 'string'
          ? error
          : error?.error?.message || error?.message || 'Login failed';
      setErrorMsg(typeof error === 'string' ? error : message);
    }
  });

  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5 }}>
      <Typography variant="h4">
        {isAdminLogin ? 'Admin sign in to Valiarian' : 'Super Admin sign in to Valiarian'}
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2">
          {isAdminLogin ? 'Super admin login?' : 'Admin login?'}
        </Typography>

        <Link
          variant="subtitle2"
          underline="hover"
          sx={{ cursor: 'pointer' }}
          onClick={() =>
            router.push(isAdminLogin ? paths.auth.jwt.login : paths.auth.jwt.adminLogin)
          }
        >
          {isAdminLogin ? 'Use super admin login' : 'Use admin login'}
        </Link>
      </Stack>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2.5}>
      {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      <RHFTextField name="email" label="Email address" />

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
        <RHFCheckbox name="rememberMe" label="Remember me" sx={{ m: 0 }} />
        <Link
          variant="body2"
          color="inherit"
          underline="always"
          sx={{
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
          onClick={() => router.push(paths.auth.jwt.forgotPassword)}
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

      {/* <Alert severity="info" sx={{ mb: 3 }}>
        Use email : <strong>demo@valiarian.cc</strong> / password :<strong> demo1234</strong>
      </Alert> */}

      {renderForm}
    </FormProvider>
  );
}

JwtLoginView.propTypes = {
  loginType: PropTypes.oneOf(['super_admin', 'admin']),
};
