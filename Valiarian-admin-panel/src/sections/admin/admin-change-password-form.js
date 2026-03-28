import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
// utils
import axios, { endpoints } from 'src/utils/axios';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
import { useSnackbar } from 'src/components/snackbar';
import { useBoolean } from 'src/hooks/use-boolean';

// ----------------------------------------------------------------------

export default function AdminChangePasswordForm({ currentAdmin }) {
  const { enqueueSnackbar } = useSnackbar();
  const password = useBoolean();
  const confirmPassword = useBoolean();

  const ChangePasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        password: Yup.string()
          .required('New password is required')
          .min(6, 'Password must be at least 6 characters'),
        confirmPassword: Yup.string()
          .required('Confirm password is required')
          .oneOf([Yup.ref('password')], 'Passwords must match'),
      }),
    []
  );

  const methods = useForm({
    resolver: yupResolver(ChangePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.patch(endpoints.auth.adminUpdate(currentAdmin.id), {
        password: data.password,
      });

      reset();
      enqueueSnackbar('Password updated successfully!');
    } catch (error) {
      console.error(error);
      const message = error?.message || 'Unable to update password.';

      enqueueSnackbar(message, { variant: 'error' });
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack component={Card} spacing={3} sx={{ p: 3 }}>
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
          helperText={
            <Stack component="span" direction="row" alignItems="center">
              <Iconify icon="eva:info-fill" width={16} sx={{ mr: 0.5 }} /> Password must be minimum
              6+
            </Stack>
          }
        />

        <RHFTextField
          name="confirmPassword"
          label="Confirm New Password"
          type={confirmPassword.value ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={confirmPassword.onToggle} edge="end">
                  <Iconify
                    icon={confirmPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <LoadingButton type="submit" variant="contained" loading={isSubmitting} sx={{ ml: 'auto' }}>
          Save Changes
        </LoadingButton>
      </Stack>
    </FormProvider>
  );
}

AdminChangePasswordForm.propTypes = {
  currentAdmin: PropTypes.object.isRequired,
};
