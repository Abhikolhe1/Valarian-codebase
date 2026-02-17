import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
// components
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function CMSMediaFolderDialog({ open, onClose, onCreateFolder }) {
  const { enqueueSnackbar } = useSnackbar();
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      enqueueSnackbar('Please enter a folder name', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await onCreateFolder(folderName.trim());
      setFolderName('');
      onClose();
    } catch (error) {
      console.error('Create folder error:', error);
      enqueueSnackbar('Failed to create folder', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create New Folder</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            autoFocus
            label="Folder Name"
            placeholder="Enter folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate();
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleCreate} variant="contained" disabled={loading}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CMSMediaFolderDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onCreateFolder: PropTypes.func,
};
