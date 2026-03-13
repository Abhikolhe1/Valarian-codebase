import { useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
// components
import UserAddressCreateView from './user-address-create-view';
import UserAddressEditView from './user-address-edit-view';
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

  const handleShowList = () => {
    setCurrentView(VIEW_MODES.LIST);
    setSelectedAddress(null);
  };

  const handleShowCreate = () => {
    setCurrentView(VIEW_MODES.CREATE);
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

      {currentView === VIEW_MODES.CREATE && (
        <UserAddressCreateView
          onCancel={handleShowList}
          onSuccess={handleSuccess}
        />
      )}

      {currentView === VIEW_MODES.EDIT && selectedAddress && (
        <UserAddressEditView
          address={selectedAddress}
          onCancel={handleShowList}
          onSuccess={handleSuccess}
        />
      )}
    </Box>
  );
}
