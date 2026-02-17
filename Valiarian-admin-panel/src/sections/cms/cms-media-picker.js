import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import Iconify from 'src/components/iconify';
import Lightbox, { useLightBox } from 'src/components/lightbox';
import { useSnackbar } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
//
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
}) {
  const { enqueueSnackbar } = useSnackbar();

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selected, setSelected] = useState(selectedMedia);
  const [currentTab, setCurrentTab] = useState('library');
  const [folders, setFolders] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    folder: '',
    mimeType: '',
  });

  const uploadDialog = useBoolean();

  // Prepare slides for lightbox
  const slides = media
    .filter((item) => item.mimeType.startsWith('image/'))
    .map((item) => ({
      src: item.url,
      alt: item.altText || item.originalName,
      title: item.originalName,
    }));

  const lightbox = useLightBox(slides);

  // Fetch media from API
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.folder) params.append('folder', filters.folder);
      if (filters.mimeType) params.append('mimeType', filters.mimeType);

      const response = await fetch(`http://localhost:3035/api/cms/media?${params.toString()}`);
      const data = await response.json();
      setMedia(data.data || []);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      enqueueSnackbar('Failed to load media', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, enqueueSnackbar]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3035/api/cms/media/folders');
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMedia();
      fetchFolders();
      setSelected(selectedMedia);
    }
  }, [open, fetchMedia, fetchFolders, selectedMedia]);

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

  const handleUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      try {
        setUploading(true);
        setUploadProgress(0);

        const totalFiles = files.length;
        let uploadedCount = 0;

        // Upload files sequentially
        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', filters.folder || '/');

          const response = await fetch('http://localhost:3035/api/cms/media/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          uploadedCount += 1;
          setUploadProgress((uploadedCount / totalFiles) * 100);
        });

        await Promise.all(uploadPromises);

        enqueueSnackbar(`Successfully uploaded ${totalFiles} file(s)`, { variant: 'success' });
        fetchMedia();
        setCurrentTab('library');
      } catch (error) {
        console.error('Upload error:', error);
        enqueueSnackbar(error.message || 'Failed to upload files', { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [filters.folder, enqueueSnackbar, fetchMedia]
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
                onSelectAll={multiple ? handleSelectAll : undefined}
                currentFolder={filters.folder}
                folders={folders}
              />

              {loading ? (
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
              <Upload
                multiple={multiple}
                files={[]}
                onDrop={handleUpload}
                disabled={uploading}
                accept={accept}
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
};
