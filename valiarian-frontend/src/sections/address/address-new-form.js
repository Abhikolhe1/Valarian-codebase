import PropTypes from 'prop-types';
import AddressFormDialog from './address-form-dialog';

export default function AddressNewForm({ open, onClose, onCreate, fallbackUser }) {
  return (
    <AddressFormDialog
      open={open}
      onClose={onClose}
      onSubmit={onCreate}
      title="New Address"
      submitLabel="Save Address"
      fallbackUser={fallbackUser}
    />
  );
}

AddressNewForm.propTypes = {
  fallbackUser: PropTypes.object,
  onClose: PropTypes.func,
  onCreate: PropTypes.func,
  open: PropTypes.bool,
};
