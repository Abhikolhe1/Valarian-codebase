import { updateAddress } from 'src/api/addresses';
import PropTypes from 'prop-types';
import { sanitizeAddressPayload } from 'src/utils/address';
import AddressFormDialog from './address-form-dialog';

export default function AddressEditDialog({ open, onClose, address, onSuccess, fallbackUser }) {
  return (
    <AddressFormDialog
      open={open}
      onClose={onClose}
      title="Edit Address"
      submitLabel="Update Address"
      initialValues={address}
      fallbackUser={fallbackUser}
      onSubmit={async (values) => {
        await updateAddress(address.id, sanitizeAddressPayload(values));
        if (onSuccess) {
          onSuccess('Address updated successfully!');
        }
        onClose();
      }}
    />
  );
}

AddressEditDialog.propTypes = {
  address: PropTypes.shape({
    id: PropTypes.string,
    addressLine1: PropTypes.string,
    addressLine2: PropTypes.string,
    city: PropTypes.string,
    fullName: PropTypes.string,
    landmark: PropTypes.string,
    mobileNumber: PropTypes.string,
    pincode: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    state: PropTypes.string,
    addressType: PropTypes.string,
    isPrimary: PropTypes.bool,
  }),
  fallbackUser: PropTypes.object,
  onClose: PropTypes.func,
  onSuccess: PropTypes.func,
  open: PropTypes.bool,
};
