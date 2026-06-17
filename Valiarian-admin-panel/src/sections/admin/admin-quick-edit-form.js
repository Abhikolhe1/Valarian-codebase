import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
// utils
import axios, { endpoints } from 'src/utils/axios';
// components
import { useSnackbar } from 'src/components/snackbar';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export default function AdminQuickEditForm({ currentAdmin, open, onClose, onUpdated }) {
  const { enqueueSnackbar } = useSnackbar();

  const QuickEditSchema = Yup.object().shape({
    fullName: Yup.string().required('Full name is required'),
    phone: Yup.string().required('Phone is required'),
    isActive: Yup.string().oneOf(['true', 'false']).required('Status is required'),
  });

  const defaultValues = useMemo(
    () => ({
      fullName: currentAdmin?.fullName || '',
      phone: currentAdmin?.phone || '',
      isActive: `${currentAdmin?.isActive ?? true}`,
    }),
    [currentAdmin]
  );

  const methods = useForm({
    resolver: yupResolver(QuickEditSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [defaultValues, open, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.patch(endpoints.auth.adminUpdate(currentAdmin.id), {
        fullName: data.fullName,
        phone: data.phone,
        isActive: data.isActive === 'true',
      });

      enqueueSnackbar('Admin updated successfully!');
      onUpdated?.();
      onClose();
    } catch (error) {
      console.error(error);
      const message =
        typeof error === 'string'
          ? error
          : error?.error?.message || error?.message || 'Failed to update admin';

      enqueueSnackbar(message, { variant: 'error' });
    }
  });

  return (
    <Dialog
      fullWidth
      maxWidth={false}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { maxWidth: 640 },
      }}
    >
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Quick Edit Admin</DialogTitle>

        <DialogContent>
          <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
            You can update only name, phone, and active status here.
          </Alert>

          <Box
            rowGap={3}
            columnGap={2}
            display="grid"
            gridTemplateColumns={{
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
            }}
          >
            <RHFTextField name="fullName" label="Full Name" />
            <RHFTextField name="phone" label="Phone Number" />
            <RHFTextField
              select
              name="isActive"
              label="Status"
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </RHFTextField>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>

          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            Update
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

AdminQuickEditForm.propTypes = {
  currentAdmin: PropTypes.object,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
  open: PropTypes.bool,
};
