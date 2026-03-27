import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
// routes
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hook';
// utils
import axios, { endpoints } from 'src/utils/axios';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function AdminNewEditForm({ currentAdmin, includePasswordFields }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!currentAdmin;

  const schema = Yup.object().shape({
    fullName: Yup.string().required('Full name is required'),
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
    phone: Yup.string().required('Phone is required'),
    password: includePasswordFields
      ? Yup.string()
          .required('Password is required')
          .min(6, 'Password must be at least 6 characters')
      : Yup.string(),
    confirmPassword: includePasswordFields
      ? Yup.string()
          .required('Confirm password is required')
          .oneOf([Yup.ref('password')], 'Passwords must match')
      : Yup.string(),
    isActive: Yup.string().oneOf(['true', 'false']).required('Status is required'),
  });

  const defaultValues = useMemo(
    () => ({
      fullName: currentAdmin?.fullName || '',
      email: currentAdmin?.email || '',
      phone: currentAdmin?.phone || '',
      password: '',
      confirmPassword: '',
      isActive: `${currentAdmin?.isActive ?? true}`,
    }),
    [currentAdmin]
  );

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentAdmin) {
      reset(defaultValues);
    }
  }, [currentAdmin, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        isActive: data.isActive === 'true',
      };

      if (includePasswordFields && data.password) {
        payload.password = data.password;
      }

      if (isEdit) {
        await axios.patch(endpoints.auth.adminUpdate(currentAdmin.id), payload);
        enqueueSnackbar('Admin updated successfully!');
      } else {
        await axios.post(endpoints.auth.createAdmin, payload);
        enqueueSnackbar('Admin created successfully!');
      }

      reset();
      router.push(paths.dashboard.admins.list);
    } catch (error) {
      console.error(error);
      const message = error?.error?.message;

      enqueueSnackbar(message, { variant: 'error' });
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={3}>
              <RHFTextField name="fullName" label="Full Name" />
              <RHFTextField name="email" label="Email Address" />
              <RHFTextField name="phone" label="Phone Number" />
              <RHFTextField select name="isActive" label="Status">
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </RHFTextField>
              {includePasswordFields && (
                <>
                  <RHFTextField name="password" label="Password" type="password" />
                  <RHFTextField
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                  />
                </>
              )}
            </Stack>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {isEdit ? 'Save Changes' : 'Create Admin'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}

AdminNewEditForm.propTypes = {
  currentAdmin: PropTypes.object,
  includePasswordFields: PropTypes.bool,
};

AdminNewEditForm.defaultProps = {
  includePasswordFields: true,
};
