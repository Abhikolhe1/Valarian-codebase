import { useCallback, useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';

import {
  createAddress,
  deleteAddress,
  setPrimaryAddress,
  useGetAddresses,
} from 'src/api/addresses';
import { useAuthContext } from 'src/auth/hooks';
// components
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { mapAddressToDisplay, sanitizeAddressPayload } from 'src/utils/address';
//
import { AddressEditDialog, AddressItem, AddressNewForm } from '../address';

// ----------------------------------------------------------------------

export default function AccountBillingAddress() {
  const [addressId, setAddressId] = useState('');
  const [editingAddress, setEditingAddress] = useState(null);

  const popover = usePopover();

  const addressForm = useBoolean();
  const editForm = useBoolean();
  const { addresses, isLoading, error, mutate } = useGetAddresses();
  const { user } = useAuthContext();

  const selectedAddress = addresses.find((address) => `${address.id}` === addressId);

  const handleAddNewAddress = useCallback(
    async (address) => {
      await createAddress(sanitizeAddressPayload(address));
      addressForm.onFalse();
      mutate();
    },
    [addressForm, mutate]
  );

  const handleSelectedId = useCallback(
    (event, id) => {
      popover.onOpen(event);
      setAddressId(id);
    },
    [popover]
  );

  const handleClose = useCallback(() => {
    popover.onClose();
    setAddressId('');
  }, [popover]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Address Book"
          action={
            <Button
              size="small"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={addressForm.onTrue}
            >
              Address
            </Button>
          }
        />

        <Stack spacing={2.5} sx={{ p: 3 }}>
          {error ? <Alert severity="error">Unable to load your addresses right now.</Alert> : null}

          {addresses.length ? (
            addresses.map((address) => (
              <AddressItem
                variant="outlined"
                key={address.id}
                address={mapAddressToDisplay(address, user)}
                action={
                  <IconButton
                    onClick={(event) => {
                      handleSelectedId(event, `${address.id}`);
                    }}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <Iconify icon="eva:more-vertical-fill" />
                  </IconButton>
                }
                sx={{
                  p: 2.5,
                  borderRadius: 1,
                }}
              />
            ))
          ) : (
            <Stack spacing={1} sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="subtitle1">No saved addresses</Typography>
              <Typography variant="body2" color="text.secondary">
                Add an address here and it will also be available during checkout.
              </Typography>
            </Stack>
          )}
        </Stack>
      </Card>

      <CustomPopover open={popover.open} onClose={handleClose}>
        <MenuItem
          onClick={async () => {
            handleClose();
            if (!selectedAddress) {
              return;
            }
            await setPrimaryAddress(selectedAddress.id);
            mutate();
          }}
        >
          <Iconify icon="eva:star-fill" />
          Set as primary
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            if (!selectedAddress) {
              return;
            }
            setEditingAddress(selectedAddress);
            editForm.onTrue();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>

        <MenuItem
          onClick={async () => {
            handleClose();
            if (!selectedAddress) {
              return;
            }
            await deleteAddress(selectedAddress.id);
            mutate();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </CustomPopover>

      <AddressNewForm
        open={addressForm.value}
        onClose={addressForm.onFalse}
        fallbackUser={user}
        onCreate={handleAddNewAddress}
      />

      <AddressEditDialog
        open={editForm.value}
        onClose={() => {
          editForm.onFalse();
          setEditingAddress(null);
        }}
        address={editingAddress}
        fallbackUser={user}
        onSuccess={() => {
          mutate();
          editForm.onFalse();
          setEditingAddress(null);
        }}
      />
    </>
  );
}
