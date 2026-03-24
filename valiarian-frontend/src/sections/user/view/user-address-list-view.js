import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
// api
import { deleteAddress, setPrimaryAddress, useGetAddresses } from 'src/api/addresses';
import { useAuthContext } from 'src/auth/hooks';
import { mapAddressToDisplay } from 'src/utils/address';
import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

export default function UserAddressListView({ onAdd, onEdit }) {
  const { addresses, isLoading, mutate } = useGetAddresses();
  const { user } = useAuthContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSetPrimary = async (id) => {
    try {
      setErrorMsg('');
      await setPrimaryAddress(id);
      setSuccessMsg('Primary address updated!');
      await mutate();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to set primary address');
    }
  };

  const handleDeleteClick = (address) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAddressToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (addressToDelete) {
      try {
        setErrorMsg('');
        await deleteAddress(addressToDelete.id);
        setSuccessMsg('Address deleted successfully!');
        await mutate();
        setDeleteDialogOpen(false);
        setAddressToDelete(null);
      } catch (error) {
        setErrorMsg(error.response?.data?.message || error.message || 'Failed to delete address');
        setDeleteDialogOpen(false);
        setAddressToDelete(null);
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Manage Addresses</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={onAdd}
        >
          Add Address
        </Button>
      </Stack>

      {/* Error/Success Messages */}
      {errorMsg && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" variant="body2">
            {errorMsg}
          </Typography>
        </Box>
      )}
      {successMsg && (
        <Box sx={{ mb: 2 }}>
          <Typography color="success.main" variant="body2">
            {successMsg}
          </Typography>
        </Box>
      )}

      {/* Address List */}
      <Stack spacing={2}>
        {addresses && addresses.length > 0 ? (
          addresses.map((address) => {
            const displayAddress = mapAddressToDisplay(address, user);

            return (
              <Card key={address.id} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Stack spacing={1} sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {displayAddress.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {displayAddress.fullAddress}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {displayAddress.phoneNumber || '-'}
                        </Typography>
                      </Stack>
                      {address.isPrimary && (
                        <Box sx={{ bgcolor: 'success.lighter', px: 1.5, py: 0.5, borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                            Primary
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      {!address.isPrimary && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSetPrimary(address.id)}
                        >
                          Set as Primary
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Iconify icon="solar:pen-bold" />}
                        onClick={() => onEdit(address)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                        onClick={() => handleDeleteClick(address)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent>
              <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
                <Iconify icon="solar:home-2-bold-duotone" width={64} sx={{ color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                  No addresses found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add your first address to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={onAdd}
                >
                  Add Address
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Address
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this address?
            {addressToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{mapAddressToDisplay(addressToDelete, user).name}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mapAddressToDisplay(addressToDelete, user).fullAddress}
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

UserAddressListView.propTypes = {
  onAdd: PropTypes.func,
  onEdit: PropTypes.func,
};
