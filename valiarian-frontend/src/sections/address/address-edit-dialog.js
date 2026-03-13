import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
// api
import { updateAddress } from 'src/api/addresses';
import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

export default function AddressEditDialog({ open, onClose, address, onSuccess }) {
  const AddressSchema = Yup.object().shape({
    address: Yup.string().required('Address is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    country: Yup.string().required('Country is required'),
    zipCode: Yup.number()
      .transform((value, originalValue) =>
        originalValue === '' ? undefined : Number(originalValue)
      )
      .typeError('Zip code must be a number')
      .required('Zip code is required')
      .positive('Zip code must be positive'),
  });

  const defaultValues = {
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
  };

  const methods = useForm({
    resolver: yupResolver(AddressSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (address && open) {
      reset({
        address: address.address || '',
        city: address.city || '',
        state: address.state || '',
        country: address.country || '',
        zipCode: address.zipCode || '',
      });
    }
  }, [address, open, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Convert zipCode to number
      const addressData = {
        ...data,
        zipCode: Number(data.zipCode)
      };

      await updateAddress(address.id, addressData);
      onSuccess('Address updated successfully!');
      onClose();
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Edit Address</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <RHFTextField
              name="address"
              label="Address"
              multiline
              rows={2}
              placeholder="Enter your full address"
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="city" label="City" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="state" label="State" />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <RHFTextField name="country" label="Country" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <RHFTextField
                  name="zipCode"
                  label="Zip Code"
                  type="number"
                  inputMode="numeric"
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" variant="outlined" onClick={onClose}>
            Cancel
          </Button>

          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            Update Address
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

AddressEditDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSuccess: PropTypes.func,
  address: PropTypes.shape({
    id: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    country: PropTypes.string,
    zipCode: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
  }),
};
