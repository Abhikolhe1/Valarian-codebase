import PropTypes from 'prop-types';
import { createAddress } from 'src/api/addresses';
import { useAuthContext } from 'src/auth/hooks';
import { AddressNewForm } from 'src/sections/address';
import { sanitizeAddressPayload } from 'src/utils/address';

export default function UserAddressCreateView({ onCancel, onSuccess }) {
  const { user } = useAuthContext();

  return (
    <AddressNewForm
      open
      onClose={onCancel}
      fallbackUser={user}
      onCreate={async (address) => {
        await createAddress(sanitizeAddressPayload(address));
        onSuccess('Address added successfully!');
      }}
    />
  );
}

UserAddressCreateView.propTypes = {
  onCancel: PropTypes.func,
  onSuccess: PropTypes.func,
};
