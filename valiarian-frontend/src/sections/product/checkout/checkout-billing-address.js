import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// api
import { createAddress, useGetAddresses } from 'src/api/addresses';
// auth
import { useAuthContext } from 'src/auth/hooks';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
// sections
//
import { AddressEditDialog, AddressItem, AddressNewForm } from '../../address';
import CheckoutSummary from './checkout-summary';

// ----------------------------------------------------------------------

export default function CheckoutBillingAddress({ checkout, onBackStep, onCreateBilling }) {
  const addressForm = useBoolean();
  const editForm = useBoolean();
  const { addresses, isLoading, error, mutate } = useGetAddresses();
  const [editingAddress, setEditingAddress] = useState(null);
  const { user } = useAuthContext();

  const buildBillingAddress = (address, fallbackName, fallbackPhone) => ({
    id: address.id,
    name:
      address.fullName ||
      fallbackName ||
      user?.fullName ||
      user?.email ||
      `Address ${address.id?.slice(-4)}`,
    fullName:
      address.fullName ||
      fallbackName ||
      user?.fullName ||
      user?.email ||
      `Address ${address.id?.slice(-4)}`,
    fullAddress: `${address.address}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`,
    address: address.address,
    city: address.city,
    state: address.state,
    country: address.country,
    zipCode: String(address.zipCode),
    phone: address.phone || fallbackPhone || user?.phone || '',
    phoneNumber: address.phone || fallbackPhone || user?.phone || '',
    addressType: address.isPrimary ? 'Primary' : 'Secondary',
    primary: address.isPrimary,
  });

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    editForm.onTrue();
  };

  const handleEditComplete = (message) => {
    setEditingAddress(null);
    editForm.onFalse();
    mutate(); // Refresh addresses after edit
    if (message) {
      // You could show a success message here if needed
      console.log(message);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load saved addresses. You can still add a new address below.
            </Alert>
          )}

          {addresses && addresses.length > 0 ? (
            addresses.map((address) => (
              <AddressItem
                key={address.id}
                address={buildBillingAddress(address)}
                action={
                  <Stack flexDirection="row" flexWrap="wrap" flexShrink={0} spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:pen-bold" />}
                      onClick={() => handleEditAddress(address)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => onCreateBilling(buildBillingAddress(address))}
                    >
                      Deliver to this Address
                    </Button>
                  </Stack>
                }
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: (theme) => theme.customShadows.card,
                }}
              />
            ))
          ) : (
            <Stack spacing={2} sx={{ p: 3, textAlign: 'center' }}>
              <Iconify icon="solar:home-2-bold-duotone" width={64} sx={{ color: 'text.disabled', mx: 'auto' }} />
              <Typography variant="h6" color="text.secondary">
                No addresses found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first address to continue with checkout
              </Typography>
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between">
            <Button
              size="small"
              color="inherit"
              onClick={onBackStep}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back
            </Button>

            <Button
              size="small"
              color="primary"
              onClick={addressForm.onTrue}
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New Address
            </Button>
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          <CheckoutSummary
            total={checkout.total}
            subTotal={checkout.subTotal}
            discount={checkout.discount}
          />
        </Grid>
      </Grid>

      <AddressNewForm
        open={addressForm.value}
        onClose={addressForm.onFalse}
        onCreate={async (newAddress) => {
          const createdAddress = await createAddress({
            fullName: newAddress.name,
            phone: newAddress.phoneNumber,
            email: user?.email || undefined,
            address: newAddress.address,
            city: newAddress.city,
            state: newAddress.state,
            country: newAddress.country,
            zipCode: newAddress.zipCode,
            isPrimary: newAddress.isPrimary,
          });

          onCreateBilling(buildBillingAddress(createdAddress, newAddress.name, newAddress.phoneNumber));
          addressForm.onFalse();
          mutate();
        }}
      />

      {/* Edit Address Dialog */}
      <AddressEditDialog
        open={editForm.value}
        onClose={() => {
          setEditingAddress(null);
          editForm.onFalse();
        }}
        address={editingAddress}
        onSuccess={handleEditComplete}
      />
    </>
  );
}

CheckoutBillingAddress.propTypes = {
  checkout: PropTypes.object,
  onBackStep: PropTypes.func,
  onCreateBilling: PropTypes.func,
};
