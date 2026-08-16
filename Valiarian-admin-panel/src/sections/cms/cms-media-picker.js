import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { mutate as mutateGlobal } from 'swr';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// api
import { useGetMedia, useGetMediaFolders } from 'src/api/cms-media';
// utils
import axiosInstance, { endpoints } from 'src/utils/axios';
import { fData } from 'src/utils/format-number';
// components
import { ConfirmDialog } from 'src/components/custom-dialog';
import Iconify from 'src/components/iconify';
import Lightbox, { useLightBox } from 'src/components/lightbox';
import { useSnackbar } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
//
import CMSMediaBulkDialog from './cms-media-bulk-dialog';
import CMSMediaCard from './cms-media-card';
import CMSMediaToolbar from './cms-media-toolbar';

// ----------------------------------------------------------------------

export default function CMSMediaPicker({
  open,
  onClose,
  onSelect,
  multiple = false,
  selectedMedia = [],
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
    'video/*': ['.mp4', '.webm'],
  },
  maxSize,
}) {
  const { enqueueSnackbar } = useSnackbar();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selected, setSelected] = useState(selectedMedia);
  const [currentTab, setCurrentTab] = useState('library');
  const [filters, setFilters] = useState({
    search: '',
    folder: '',
    mimeType: '',
  });
  const [uploadFolder, setUploadFolder] = useState('/');
  const [newUploadFolder, setNewUploadFolder] = useState('');

  const uploadDialog = useBoolean();
  const deleteConfirm = useBoolean();
  const bulkDialog = useBoolean();

  // useGetMedia's SWR key varies per filter combination (folder/search/type),
  // so each folder ever viewed gets its own cache entry. The hook's own bound
  // mutate() only refreshes whichever combination is currently active, which
  // leaves e.g. a move's destination folder still serving stale cached data
  // if you'd viewed it before. Invalidate every cached variation instead.
  const invalidateAllMediaLists = useCallback(
    () =>
      mutateGlobal(
        (key) =>
          key === endpoints.cms.media.list ||
          (Array.isArray(key) && key[0] === endpoints.cms.media.list)
      ),
    []
  );

  // Use hooks to get media and folders
  const { media, mediaLoading } = useGetMedia(filters, open);
  const { folders, foldersMutate } = useGetMediaFolders();

  // Prepare slides for lightbox
  const slides = media
    .filter((item) => item.mimeType.startsWith('image/'))
    .map((item) => ({
      src: item.url,
      alt: item.altText || item.originalName,
      title: item.originalName,
    }));

  const lightbox = useLightBox(slides);

  useEffect(() => {
    if (open) {
      setSelected(selectedMedia);
    }
  }, [open, selectedMedia]);

  const handleFilters = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSelectMedia = useCallback(
    (mediaId) => {
      if (multiple) {
        setSelected((prev) =>
          prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
        );
      } else {
        setSelected([mediaId]);
      }
    },
    [multiple]
  );

  const handleSelectAll = useCallback(() => {
    if (selected.length === media.length) {
      setSelected([]);
    } else {
      setSelected(media.map((m) => m.id));
    }
  }, [media, selected]);

  const handleDeleteSingle = useCallback(
    async (mediaId) => {
      try {
        await axiosInstance.delete(endpoints.cms.media.details(mediaId));

        enqueueSnackbar('Media deleted successfully', { variant: 'success' });
        setSelected((prev) => prev.filter((id) => id !== mediaId));
        invalidateAllMediaLists();
        foldersMutate();
      } catch (error) {
        console.error('Delete error:', error);
        enqueueSnackbar('Failed to delete media', { variant: 'error' });
      }
    },
    [enqueueSnackbar, invalidateAllMediaLists, foldersMutate]
  );

  const handleDeleteSelected = useCallback(async () => {
    try {
      await axiosInstance.post(`${endpoints.cms.media.list}/bulk-delete`, {
        mediaIds: selected,
      });

      enqueueSnackbar(`Successfully deleted ${selected.length} file(s)`, {
        variant: 'success',
      });
      setSelected([]);
      invalidateAllMediaLists();
      foldersMutate();
      deleteConfirm.onFalse();
    } catch (error) {
      console.error('Delete error:', error);
      enqueueSnackbar('Failed to delete media', { variant: 'error' });
    }
  }, [selected, enqueueSnackbar, deleteConfirm, invalidateAllMediaLists, foldersMutate]);

  const handleMoveToFolder = useCallback(
    async (targetFolder) => {
      try {
        await axiosInstance.post(`${endpoints.cms.media.list}/bulk-move`, {
          mediaIds: selected,
          folder: targetFolder,
        });

        enqueueSnackbar(`Successfully moved ${selected.length} file(s)`, {
          variant: 'success',
        });
        setSelected([]);
        invalidateAllMediaLists();
        foldersMutate();
      } catch (error) {
        console.error('Move error:', error);
        enqueueSnackbar('Failed to move files', { variant: 'error' });
        throw error;
      }
    },
    [selected, enqueueSnackbar, invalidateAllMediaLists, foldersMutate]
  );

  const handleUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      const targetFolder =
        (uploadFolder === '__new__' ? newUploadFolder.trim() : uploadFolder) || '/';

      if (uploadFolder === '__new__' && !newUploadFolder.trim()) {
        enqueueSnackbar('Please enter a folder name', { variant: 'warning' });
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);

        const totalFiles = files.length;
        let uploadedCount = 0;

        // Upload files sequentially
        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', targetFolder);

          await axiosInstance.post(endpoints.cms.media.upload, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: () => {
              uploadedCount += 1;
              setUploadProgress((uploadedCount / totalFiles) * 100);
            }
          });
        });

        await Promise.all(uploadPromises);

        enqueueSnackbar(`Successfully uploaded ${totalFiles} file(s)`, { variant: 'success' });
        // Trigger SWR revalidation — both the media list and the distinct
        // folders list, since a fresh/new folder name only becomes visible
        // in filters/move/upload dropdowns once this second key revalidates.
        invalidateAllMediaLists();
        foldersMutate();
        // Jump the library view to the folder we just uploaded into, so the
        // new file(s) are immediately visible instead of looking "missing".
        setFilters((prev) => ({ ...prev, folder: targetFolder === '/' ? '' : targetFolder }));
        setNewUploadFolder('');
        setCurrentTab('library');
      } catch (error) {
        console.error('Upload error:', error);
        enqueueSnackbar(error?.error?.message || 'Failed to upload files', { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [uploadFolder, newUploadFolder, enqueueSnackbar, invalidateAllMediaLists, foldersMutate]
  );

  const handlePreviewMedia = useCallback(
    (mediaItem) => {
      if (mediaItem.mimeType.startsWith('image/')) {
        lightbox.onOpen(mediaItem.url);
      }
    },
    [lightbox]
  );

  const handleConfirm = () => {
    const selectedMediaItems = media.filter((item) => selected.includes(item.id));
    onSelect(multiple ? selectedMediaItems : selectedMediaItems[0]);
    onClose();
  };

  const handleCancel = () => {
    setSelected(selectedMedia);
    onClose();
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      <Dialog open={open} onClose={handleCancel} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {multiple ? 'Select Media Files' : 'Select Media File'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selected.length} selected
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          <Tabs value={currentTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
            <Tab label="Media Library" value="library" />
            <Tab label="Upload New" value="upload" />
          </Tabs>

          {currentTab === 'library' && (
            <Box>
              <CMSMediaToolbar
                filters={filters}
                onFilters={handleFilters}
                selectedCount={selected.length}
                totalCount={media.length}
                onSelectAll={handleSelectAll}
                onDeleteSelected={deleteConfirm.onTrue}
                onMoveSelected={bulkDialog.onTrue}
                currentFolder={filters.folder}
                folders={folders}
              />

              {mediaLoading ? (
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading media...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 3 }}>
                  {media.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                      <Iconify
                        icon="solar:gallery-bold-duotone"
                        width={80}
                        sx={{ mb: 2, color: 'text.disabled' }}
                      />
                      <Typography variant="h6" gutterBottom>
                        No media files
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload your first file to get started
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={3}>
                      {media.map((item) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                          <CMSMediaCard
                            media={item}
                            selected={selected.includes(item.id)}
                            onSelect={() => handleSelectMedia(item.id)}
                            onDelete={() => handleDeleteSingle(item.id)}
                            onPreview={() => handlePreviewMedia(item)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}
            </Box>
          )}

          {currentTab === 'upload' && (
            <Box sx={{ p: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Upload to Folder</InputLabel>
                <Select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  label="Upload to Folder"
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

              {uploadFolder === '__new__' && (
                <TextField
                  fullWidth
                  autoFocus
                  label="New Folder Name"
                  placeholder="Enter folder name"
                  value={newUploadFolder}
                  onChange={(e) => setNewUploadFolder(e.target.value)}
                  sx={{ mb: 2 }}
                />
              )}

              <Upload
                multiple={multiple}
                files={[]}
                onDrop={handleUpload}
                disabled={uploading}
                accept={accept}
                maxSize={maxSize}
                helperText={
                  maxSize && (
                    <Typography
                      variant="caption"
                      sx={{ mt: 2, mx: 'auto', display: 'block', textAlign: 'center', color: 'text.secondary' }}
                    >
                      Max file size: {fData(maxSize)}
                    </Typography>
                  )
                }
              />

              {uploading && (
                <Box sx={{ mt: 3 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2">Uploading files...</Typography>
                      <Typography variant="body2">{Math.round(uploadProgress)}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancel} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={selected.length === 0}
            startIcon={<Iconify icon="eva:checkmark-fill" />}
          >
            Select {selected.length > 0 && `(${selected.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox for Image Preview */}
      <Lightbox
        index={lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        onGetCurrentIndex={(index) => lightbox.setSelected(index)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.value}
        onClose={deleteConfirm.onFalse}
        title="Delete Media"
        content={
          <>
            Are you sure you want to delete <strong>{selected.length}</strong> file(s)? This
            action cannot be undone.
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={handleDeleteSelected}>
            Delete
          </Button>
        }
      />

      {/* Move to Folder Dialog */}
      <CMSMediaBulkDialog
        open={bulkDialog.value}
        onClose={bulkDialog.onFalse}
        selectedCount={selected.length}
        folders={folders}
        onMoveToFolder={handleMoveToFolder}
      />
    </>
  );
}

CMSMediaPicker.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  selectedMedia: PropTypes.array,
  accept: PropTypes.object,
  maxSize: PropTypes.number,
};
