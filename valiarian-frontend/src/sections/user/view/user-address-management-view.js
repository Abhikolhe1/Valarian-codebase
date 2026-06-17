import { useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { createAddress } from 'src/api/addresses';
import { useAuthContext } from 'src/auth/hooks';
import { sanitizeAddressPayload } from 'src/utils/address';
import { AddressEditDialog, AddressNewForm } from 'src/sections/address';
// components
import UserAddressListView from './user-address-list-view';

// ----------------------------------------------------------------------

const VIEW_MODES = {
  LIST: 'list',
  CREATE: 'create',
  EDIT: 'edit',
};

export default function UserAddressManagementView() {
  const [currentView, setCurrentView] = useState(VIEW_MODES.LIST);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' | 'error'
  const { user } = useAuthContext();

  const handleShowList = () => {
    setCurrentView(VIEW_MODES.LIST);
    setSelectedAddress(null);
  };

  const handleShowCreate = () => {
    setCurrentView(VIEW_MODES.CREATE);
    setSelectedAddress(null);
    setMessage('');
  };

  const handleShowEdit = (address) => {
    setSelectedAddress(address);
    setCurrentView(VIEW_MODES.EDIT);
    setMessage('');
  };

  const handleSuccess = (successMessage) => {
    setMessage(successMessage);
    setMessageType('success');
    setCurrentView(VIEW_MODES.LIST);
    setSelectedAddress(null);

    // Clear message after 5 seconds
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  const handleError = (errorMessage) => {
    setMessage(errorMessage);
    setMessageType('error');

    // Clear message after 5 seconds
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  return (
    <Box>
      {/* Success/Error Messages */}
      {message && (
        <Box sx={{ mb: 3 }}>
          <Alert severity={messageType} onClose={() => setMessage('')}>
            {message}
          </Alert>
        </Box>
      )}

      {/* Render Current View */}
      {currentView === VIEW_MODES.LIST && (
        <UserAddressListView
          onAdd={handleShowCreate}
          onEdit={handleShowEdit}
        />
      )}

      <AddressNewForm
        open={currentView === VIEW_MODES.CREATE}
        onClose={handleShowList}
        fallbackUser={user}
        onCreate={async (address) => {
          await createAddress(sanitizeAddressPayload(address));
          handleSuccess('Address added successfully!');
        }}
      />

      <AddressEditDialog
        open={currentView === VIEW_MODES.EDIT}
        onClose={handleShowList}
        address={selectedAddress}
        fallbackUser={user}
        onSuccess={() => {
          handleSuccess('Address updated successfully!');
        }}
      />
    </Box>
  );
}
