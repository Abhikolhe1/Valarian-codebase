import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
// api
import { createAddress, useGetAddresses } from 'src/api/addresses';
// auth
import { useAuthContext } from 'src/auth/hooks';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import Iconify from 'src/components/iconify';
import {
  mapAddressToCheckoutBilling,
  sanitizeAddressPayload,
} from 'src/utils/address';
// sections
//
import { AddressEditDialog, AddressItem, AddressNewForm } from '../../address';
import CheckoutSummary from './checkout-summary';
import { AddressListSkeleton, CheckoutSummarySkeleton } from './checkout-skeletons';

// ----------------------------------------------------------------------

export default function CheckoutBillingAddress({ checkout, onBackStep, onCreateBilling }) {
  const addressForm = useBoolean();
  const editForm = useBoolean();
  const { addresses, isLoading, error, mutate } = useGetAddresses();
  const [editingAddress, setEditingAddress] = useState(null);
  const { user } = useAuthContext();

  const buildBillingAddress = (address, fallbackName, fallbackPhone) =>
    mapAddressToCheckoutBilling(
      {
        ...address,
        fullName: address.fullName || fallbackName,
        mobileNumber: address.mobileNumber || address.phone || fallbackPhone,
      },
      user
    );

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

  let addressContent = null;

  if (isLoading) {
    addressContent = <AddressListSkeleton />;
  } else if (addresses && addresses.length > 0) {
    addressContent = addresses.map((address) => (
      <AddressItem
        key={address.id}
        address={buildBillingAddress(address)}
        action={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            flexShrink={0}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={() => handleEditAddress(address)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Edit
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => onCreateBilling(buildBillingAddress(address))}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
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
    ));
  } else {
    addressContent = (
      <Stack spacing={2} sx={{ p: 3, textAlign: 'center' }}>
        <Iconify icon="solar:home-2-bold-duotone" width={64} sx={{ color: 'text.disabled', mx: 'auto' }} />
        <Typography variant="h6" color="text.secondary">
          No addresses found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first address to continue with checkout
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid xs={12} md={8}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load saved addresses. You can still add a new address below.
            </Alert>
          )}

          {addressContent}

          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mt: 3 }}
          >
            <Button
              size="small"
              color="inherit"
              onClick={onBackStep}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              Back
            </Button>

            <Button
              size="small"
              color="primary"
              onClick={addressForm.onTrue}
              startIcon={<Iconify icon="mingcute:add-line" />}
              sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
            >
              New Address
            </Button>
          </Stack>
        </Grid>

        <Grid xs={12} md={4}>
          {isLoading ? (
            <CheckoutSummarySkeleton />
          ) : (
            <CheckoutSummary
              total={checkout.total}
              subTotal={checkout.subTotal}
              discount={checkout.discount}
              shipping={checkout.shipping}
              tax={checkout.tax}
              actual_price={checkout.actualSubTotal}
              sale_price={checkout.subTotal}
              product_discount={checkout.productDiscount}
              coupon_discount={checkout.discount}
            />
          )}
        </Grid>
      </Grid>

      <AddressNewForm
        open={addressForm.value}
        onClose={addressForm.onFalse}
        onCreate={async (newAddress) => {
          const sanitizedPayload = sanitizeAddressPayload(newAddress);
          const createdAddress = await createAddress(sanitizedPayload);

          onCreateBilling(
            buildBillingAddress(
              createdAddress,
              sanitizedPayload.fullName,
              sanitizedPayload.mobileNumber
            )
          );
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
