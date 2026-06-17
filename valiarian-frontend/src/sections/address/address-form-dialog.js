import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import LoadingButton from '@mui/lab/LoadingButton';
import FormProvider, { RHFCheckbox, RHFRadioGroup, RHFTextField } from 'src/components/hook-form';
import { ADDRESS_TYPE_OPTIONS, getAddressFormDefaultValues } from 'src/utils/address';

export default function AddressFormDialog({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  initialValues,
  fallbackUser,
}) {
  const [submitError, setSubmitError] = useState('');

  const schema = Yup.object().shape({
    fullName: Yup.string().trim().required('Full name is required'),
    mobileNumber: Yup.string()
      .trim()
      .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
      .required('Mobile number is required'),
    pincode: Yup.string()
      .trim()
      .matches(/^[0-9]{6}$/, 'Pincode must be 6 digits')
      .required('Pincode is required'),
    state: Yup.string().trim().required('State is required'),
    city: Yup.string().trim().required('City is required'),
    addressLine1: Yup.string().trim().required('Address line 1 is required'),
    addressLine2: Yup.string().trim(),
    landmark: Yup.string().trim(),
    addressType: Yup.string().oneOf(['home', 'work']).required('Address type is required'),
    isPrimary: Yup.boolean(),
  });

  const defaultValues = useMemo(
    () => getAddressFormDefaultValues(initialValues, fallbackUser),
    [fallbackUser, initialValues]
  );

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      setSubmitError('');
      reset(defaultValues);
    }
  }, [defaultValues, open, reset]);

  const handleFormSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError('');
      await onSubmit(values);
    } catch (error) {
      setSubmitError(typeof error === 'string' ? error : error?.message || 'Failed to save address');
    }
  });

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <FormProvider methods={methods} onSubmit={handleFormSubmit}>
        <DialogTitle>{title}</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            <RHFRadioGroup row name="addressType" options={ADDRESS_TYPE_OPTIONS} />

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
              <RHFTextField name="mobileNumber" label="Mobile Number" inputProps={{ maxLength: 10 }} />
            </Box>

            <RHFTextField
              name="addressLine1"
              label="Address Line 1"
              multiline
              rows={2}
              placeholder="House number, street name"
            />

            <RHFTextField
              name="addressLine2"
              label="Address Line 2"
              placeholder="Apartment, suite, area"
            />

            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <RHFTextField name="landmark" label="Landmark" />
              <RHFTextField name="pincode" label="Pincode" inputProps={{ maxLength: 6 }} />
            </Box>

            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <RHFTextField name="city" label="City" />
              <RHFTextField name="state" label="State" />
            </Box>

            <RHFCheckbox name="isPrimary" label="Use this address as default." />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button  variant="outlined" color="secondary" onClick={onClose}>
            Cancel
          </Button>

          <LoadingButton type="submit" variant="contained" color='secondary' loading={isSubmitting}>
            {submitLabel}
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

AddressFormDialog.propTypes = {
  fallbackUser: PropTypes.object,
  initialValues: PropTypes.object,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  open: PropTypes.bool,
  submitLabel: PropTypes.string,
  title: PropTypes.string,
};
