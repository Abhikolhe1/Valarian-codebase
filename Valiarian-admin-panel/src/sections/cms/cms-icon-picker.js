import PropTypes from 'prop-types';
import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

// Common icon set for navigation menus
const ICON_OPTIONS = [
  { name: 'Home', icon: 'solar:home-2-bold' },
  { name: 'About', icon: 'solar:info-circle-bold' },
  { name: 'Products', icon: 'solar:bag-4-bold' },
  { name: 'Shop', icon: 'solar:shop-bold' },
  { name: 'Cart', icon: 'solar:cart-large-4-bold' },
  { name: 'User', icon: 'solar:user-bold' },
  { name: 'Settings', icon: 'solar:settings-bold' },
  { name: 'Contact', icon: 'solar:phone-bold' },
  { name: 'Email', icon: 'solar:letter-bold' },
  { name: 'Location', icon: 'solar:map-point-bold' },
  { name: 'Search', icon: 'solar:magnifer-bold' },
  { name: 'Menu', icon: 'solar:hamburger-menu-bold' },
  { name: 'Close', icon: 'solar:close-circle-bold' },
  { name: 'Arrow Right', icon: 'solar:arrow-right-bold' },
  { name: 'Arrow Left', icon: 'solar:arrow-left-bold' },
  { name: 'Arrow Down', icon: 'solar:arrow-down-bold' },
  { name: 'Arrow Up', icon: 'solar:arrow-up-bold' },
  { name: 'Star', icon: 'solar:star-bold' },
  { name: 'Heart', icon: 'solar:heart-bold' },
  { name: 'Share', icon: 'solar:share-bold' },
  { name: 'Download', icon: 'solar:download-bold' },
  { name: 'Upload', icon: 'solar:upload-bold' },
  { name: 'Calendar', icon: 'solar:calendar-bold' },
  { name: 'Clock', icon: 'solar:clock-circle-bold' },
  { name: 'Bell', icon: 'solar:bell-bold' },
  { name: 'Chat', icon: 'solar:chat-round-dots-bold' },
  { name: 'Document', icon: 'solar:document-text-bold' },
  { name: 'Folder', icon: 'solar:folder-bold' },
  { name: 'Image', icon: 'solar:gallery-bold' },
  { name: 'Video', icon: 'solar:videocamera-bold' },
  { name: 'Music', icon: 'solar:music-note-bold' },
  { name: 'Link', icon: 'solar:link-bold' },
  { name: 'Lock', icon: 'solar:lock-bold' },
  { name: 'Unlock', icon: 'solar:lock-unlocked-bold' },
  { name: 'Eye', icon: 'solar:eye-bold' },
  { name: 'Eye Closed', icon: 'solar:eye-closed-bold' },
  { name: 'Check', icon: 'solar:check-circle-bold' },
  { name: 'Plus', icon: 'solar:add-circle-bold' },
  { name: 'Minus', icon: 'solar:minus-circle-bold' },
  { name: 'Edit', icon: 'solar:pen-bold' },
  { name: 'Delete', icon: 'solar:trash-bin-trash-bold' },
  { name: 'Filter', icon: 'solar:filter-bold' },
  { name: 'Sort', icon: 'solar:sort-bold' },
  { name: 'Refresh', icon: 'solar:refresh-bold' },
  { name: 'More', icon: 'solar:menu-dots-bold' },
];

// ----------------------------------------------------------------------

export default function CMSIconPicker({ open, onClose, value, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customIcon, setCustomIcon] = useState(value || '');

  const filteredIcons = ICON_OPTIONS.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectIcon = (icon) => {
    onChange(icon);
    onClose();
  };

  const handleUseCustomIcon = () => {
    if (customIcon.trim()) {
      onChange(customIcon.trim());
      onClose();
    }
  };

  const handleClearIcon = () => {
    onChange('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Icon</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-bold" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Current Selection */}
        {value && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Iconify icon={value} width={32} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {value}
              </Typography>
            </Box>
            <Button size="small" color="error" onClick={handleClearIcon}>
              Clear
            </Button>
          </Paper>
        )}

        {/* Icon Grid */}
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Common Icons
        </Typography>
        <Grid container spacing={1} sx={{ mb: 3 }}>
          {filteredIcons.map((option) => (
            <Grid item xs={3} sm={2} md={1.5} key={option.icon}>
              <Tooltip title={option.name}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    bgcolor: value === option.icon ? 'action.selected' : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => handleSelectIcon(option.icon)}
                >
                  <Iconify icon={option.icon} width={24} />
                </Paper>
              </Tooltip>
            </Grid>
          ))}
        </Grid>

        {/* Custom Icon Input */}
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Or Use Custom Icon
        </Typography>
        <TextField
          fullWidth
          placeholder="e.g., solar:custom-icon-bold"
          value={customIcon}
          onChange={(e) => setCustomIcon(e.target.value)}
          helperText="Enter any Iconify icon name"
          InputProps={{
            endAdornment: customIcon && (
              <InputAdornment position="end">
                <Iconify icon={customIcon} width={24} />
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        {customIcon && customIcon !== value && (
          <Button onClick={handleUseCustomIcon} variant="contained">
            Use Custom Icon
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

CMSIconPicker.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  value: PropTypes.string,
  onChange: PropTypes.func,
};
