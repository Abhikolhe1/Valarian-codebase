import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import Iconify from 'src/components/iconify';
// api
import { createAddress } from 'src/api/addresses';
import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

export default function UserAddressCreateView({ onCancel, onSuccess }) {
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
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Convert zipCode to string
      const addressData = {
        ...data,
        zipCode: String(data.zipCode)
      };

      await createAddress(addressData);
      onSuccess('Address added successfully!');
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="eva:arrow-back-fill" />}
          onClick={onCancel}
        >
          Back
        </Button>
        <Typography variant="h4">Add New Address</Typography>
      </Stack>

      {/* Form */}
      <Card>
        <CardContent>
          <FormProvider methods={methods} onSubmit={onSubmit}>
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

              <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isSubmitting}
                  sx={{ flex: 1 }}
                >
                  Add Address
                </LoadingButton>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  sx={{ flex: 1 }}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </FormProvider>
        </CardContent>
      </Card>
    </Container>
  );
}

UserAddressCreateView.propTypes = {
  onCancel: PropTypes.func,
  onSuccess: PropTypes.func,
};
