import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// utils
import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

const RETURN_REASONS = [
  'Product damaged or defective',
  'Wrong item received',
  'Item not as described',
  'Changed my mind',
  'Found a better price',
  'Quality not satisfactory',
  'Size/fit issue',
  'Other',
];

export default function ReturnRequestForm({ orderId, open, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [additionalComments, setAdditionalComments] = useSt
  {
    reason: returnReason,
      });

  // Reset form
  setReason('');
  setAdditionalComments('');

  // Call success callback
  if (onSuccess) {
    onSuccess();
  }

  // Close dialog
  onClose();
} catch (err) {
  console.error('Error submitting return request:', err);
  setError(err.response?.data?.message || 'Failed to submit return request');
} finally {
  setLoading(false);
}
  };

const handleClose = () => {
  if (!loading) {
    setReason('');
    setAdditionalComments('');
    setError(null);
    onClose();
  }
};

return (
  <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
    <DialogTitle>Request Return</DialogTitle>
    <DialogContent>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please select a reason for returning this order. Our team will review your request and
        contact you within 24-48 hours.
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Return Reason</InputLabel>
        <Select
          value={reason}
          label="Return Reason"
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
        >
          {RETURN_REASONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Additional Comments"
        value={additionalComments}
        onChange={(e) => setAdditionalComments(e.target.value)}
        placeholder="Please provide any additional details about your return request..."
        disabled={loading}
        helperText={
          reason === 'Other'
            ? 'Please describe your reason for return'
            : 'Optional: Add any additional information'
        }
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={loading || !reason}
      >
        {loading ? 'Submitting...' : 'Submit Return Request'}
      </Button>
    </DialogActions>
  </Dialog>
);
}

ReturnRequestForm.propTypes = {
  orderId: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
