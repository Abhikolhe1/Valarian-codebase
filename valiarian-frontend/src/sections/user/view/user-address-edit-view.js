import PropTypes from 'prop-types';
import { useAuthContext } from 'src/auth/hooks';
import { AddressEditDialog } from 'src/sections/address';

export default function UserAddressEditView({ address, onCancel, onSuccess }) {
  const { user } = useAuthContext();

  return (
    <AddressEditDialog
      open
      onClose={onCancel}
      address={address}
      fallbackUser={user}
      onSuccess={() => {
        onSuccess('Address updated successfully!');
      }}
    />
  );
}

UserAddressEditView.propTypes = {
  address: PropTypes.object,
  onCancel: PropTypes.func,
  onSuccess: PropTypes.func,
};
