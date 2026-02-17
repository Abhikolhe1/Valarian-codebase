import PropTypes from 'prop-types';
import { useCallback } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const MIME_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
];

// ----------------------------------------------------------------------

export default function CMSMediaToolbar({
  filters,
  onFilters,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeleteSelected,
  onMoveSelected,
  onCreateFolder,
  currentFolder,
  folders,
}) {
  const handleFilterSearch = useCallback(
    (event) => {
      onFilters('search', event.target.value);
    },
    [onFilters]
  );

  const handleFilterMimeType = useCallback(
    (event) => {
      onFilters('mimeType', event.target.value);
    },
    [onFilters]
  );

  const handleFilterFolder = useCallback(
    (event) => {
      onFilters('folder', event.target.value);
    },
    [onFilters]
  );

  const isAllSelected = selectedCount > 0 && selectedCount === totalCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{
        xs: 'column',
        md: 'row',
      }}
      sx={{
        p: 2.5,
        pr: { xs: 2.5, md: 1 },
      }}
    >
      {/* Select All Checkbox */}
      <Stack direction="row" alignItems="center" spacing={1} flexGrow={1}>
        <Tooltip title="Select all">
          <Checkbox
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onChange={onSelectAll}
          />
        </Tooltip>

        {selectedCount > 0 && (
          <>
            <Box sx={{ typography: 'subtitle2' }}>{selectedCount} selected</Box>

            <Tooltip title="Move to folder">
              <Button
                color="primary"
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:folder-with-files-bold" />}
                onClick={onMoveSelected}
              >
                Move
              </Button>
            </Tooltip>

            <Tooltip title="Delete selected">
              <Button
                color="error"
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={onDeleteSelected}
              >
                Delete
              </Button>
            </Tooltip>
          </>
        )}
      </Stack>

      {/* Search */}
      <OutlinedInput
        fullWidth
        value={filters.search}
        onChange={handleFilterSearch}
        placeholder="Search media..."
        startAdornment={
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        }
        sx={{ maxWidth: { md: 300 } }}
      />

      {/* Type Filter */}
      <FormControl
        sx={{
          flexShrink: 0,
          width: { xs: 1, md: 180 },
        }}
      >
        <InputLabel>Type</InputLabel>
        <Select
          value={filters.mimeType}
          onChange={handleFilterMimeType}
          input={<OutlinedInput label="Type" />}
        >
          {MIME_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Folder Filter */}
      <FormControl
        sx={{
          flexShrink: 0,
          width: { xs: 1, md: 200 },
        }}
      >
        <InputLabel>Folder</InputLabel>
        <Select
          value={filters.folder}
          onChange={handleFilterFolder}
          input={<OutlinedInput label="Folder" />}
        >
          <MenuItem value="">All Folders</MenuItem>
          <MenuItem value="/">Root</MenuItem>
          {folders.map((folder) => (
            <MenuItem key={folder} value={folder}>
              {folder}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Create Folder Button */}
      <Tooltip title="Create folder">
        <IconButton onClick={onCreateFolder} color="primary">
          <Iconify icon="solar:folder-with-files-bold" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

CMSMediaToolbar.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  selectedCount: PropTypes.number,
  totalCount: PropTypes.number,
  onSelectAll: PropTypes.func,
  onDeleteSelected: PropTypes.func,
  onMoveSelected: PropTypes.func,
  onCreateFolder: PropTypes.func,
  currentFolder: PropTypes.string,
  folders: PropTypes.array,
};
