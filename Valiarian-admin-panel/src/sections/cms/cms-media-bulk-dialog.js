import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
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
// components
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function CMSMediaBulkDialog({
  open,
  onClose,
  selectedCount,
  folders,
  onMoveToFolder,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    const targetFolder = selectedFolder === '__new__' ? newFolder.trim() : selectedFolder;

    if (!targetFolder) {
      enqueueSnackbar('Please select or enter a folder name', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await onMoveToFolder(targetFolder);
      setSelectedFolder('');
      setNewFolder('');
      onClose();
    } catch (error) {
      console.error('Move error:', error);
      enqueueSnackbar('Failed to move files', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFolder('');
    setNewFolder('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Move to Folder</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Move {selectedCount} selected file(s) to a folder
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Folder</InputLabel>
            <Select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              label="Select Folder"
            >
              <MenuItem value="/">Root</MenuItem>
              {folders.map((folder) => (
                <MenuItem key={folder} value={folder}>
                  {folder}
                </MenuItem>
              ))}
              <MenuItem value="__new__">+ Create New Folder</MenuItem>
            </Select>
          </FormControl>

          {selectedFolder === '__new__' && (
            <TextField
              fullWidth
              autoFocus
              label="New Folder Name"
              placeholder="Enter folder name"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleMove} variant="contained" disabled={loading}>
          Move
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CMSMediaBulkDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  selectedCount: PropTypes.number,
  folders: PropTypes.array,
  onMoveToFolder: PropTypes.func,
};
