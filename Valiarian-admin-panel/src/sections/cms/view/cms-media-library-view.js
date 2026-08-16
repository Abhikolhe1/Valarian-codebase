import { useCallback, useEffect, useState } from 'react';
import { mutate as mutateGlobal } from 'swr';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// routes
import { paths } from 'src/routes/paths';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// api
import { useGetMedia, useGetMediaFolders } from 'src/api/cms-media';
// utils
import axiosInstance, { endpoints } from 'src/utils/axios';
// components
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { ConfirmDialog } from 'src/components/custom-dialog';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
//
import Lightbox, { useLightBox } from 'src/components/lightbox';
import CMSMediaBulkDialog from '../cms-media-bulk-dialog';
import CMSMediaCard from '../cms-media-card';
import CMSMediaMetadataDialog from '../cms-media-metadata-dialog';
import CMSMediaToolbar from '../cms-media-toolbar';

// ----------------------------------------------------------------------

export default function CMSMediaLibraryView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    folder: '',
    mimeType: '',
  });
  const [uploadFolder, setUploadFolder] = useState('/');
  const [newUploadFolder, setNewUploadFolder] = useState('');

  // Use hooks to get media and folders
  const { media: mediaData, mediaLoading } = useGetMedia(filters);
  const { folders, foldersMutate } = useGetMediaFolders();

  // useGetMedia's SWR key varies per filter combination (folder/search/type),
  // so each folder ever viewed gets its own cache entry. Its own bound
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

  const [media, setMedia] = useState([]);

  // Update media when data changes
  useEffect(() => {
    if (mediaData) {
      setMedia(mediaData);
    }
  }, [mediaData]);

  const deleteConfirm = useBoolean();
  const uploadDialog = useBoolean();
  const metadataDialog = useBoolean();
  const bulkDialog = useBoolean();

  // Prepare slides for lightbox
  const slides = media
    .filter((item) => item.mimeType.startsWith('image/'))
    .map((item) => ({
      src: item.url,
      alt: item.altText || item.originalName,
      title: item.originalName,
    }));

  const lightbox = useLightBox(slides);

  const handleFilters = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSelectMedia = useCallback((mediaId) => {
    setSelectedMedia((prev) =>
      prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedMedia.length === media.length) {
      setSelectedMedia([]);
    } else {
      setSelectedMedia(media.map((m) => m.id));
    }
  }, [media, selectedMedia]);

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
            onUploadProgress: (progressEvent) => {
              uploadedCount += 1;
              setUploadProgress((uploadedCount / totalFiles) * 100);
            }
          });
        });

        await Promise.all(uploadPromises);

        enqueueSnackbar(`Successfully uploaded ${totalFiles} file(s)`, { variant: 'success' });
        // Trigger SWR revalidation — media list and the distinct folders list
        invalidateAllMediaLists();
        foldersMutate();
        // Jump the browse view to the folder we just uploaded into.
        setFilters((prev) => ({ ...prev, folder: targetFolder === '/' ? '' : targetFolder }));
        setNewUploadFolder('');
        uploadDialog.onFalse();
      } catch (error) {
        console.error('Upload error:', error);
        enqueueSnackbar(error?.error?.message || 'Failed to upload files', { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [uploadFolder, newUploadFolder, enqueueSnackbar, uploadDialog, invalidateAllMediaLists, foldersMutate]
  );

  const handleDeleteSelected = useCallback(async () => {
    try {
      await axiosInstance.post(`${endpoints.cms.media.list}/bulk-delete`, {
        mediaIds: selectedMedia
      });

      enqueueSnackbar(`Successfully deleted ${selectedMedia.length} file(s)`, {
        variant: 'success',
      });
      setSelectedMedia([]);
      // Trigger SWR revalidation
      invalidateAllMediaLists();
      foldersMutate();
      deleteConfirm.onFalse();
    } catch (error) {
      console.error('Delete error:', error);
      enqueueSnackbar('Failed to delete media', { variant: 'error' });
    }
  }, [selectedMedia, enqueueSnackbar, deleteConfirm, invalidateAllMediaLists, foldersMutate]);

  const handleDeleteSingle = useCallback(
    async (mediaId) => {
      try {
        await axiosInstance.delete(endpoints.cms.media.details(mediaId));

        enqueueSnackbar('Media deleted successfully', { variant: 'success' });
        // Trigger SWR revalidation
        invalidateAllMediaLists();
        foldersMutate();
      } catch (error) {
        console.error('Delete error:', error);
        enqueueSnackbar('Failed to delete media', { variant: 'error' });
      }
    },
    [enqueueSnackbar, invalidateAllMediaLists, foldersMutate]
  );

  const handleEditMedia = useCallback((mediaItem) => {
    setCurrentMedia(mediaItem);
    metadataDialog.onTrue();
  }, [metadataDialog]);

  const handleUpdateMedia = useCallback((updatedMedia) => {
    setMedia((prev) => prev.map((item) => (item.id === updatedMedia.id ? updatedMedia : item)));
  }, []);

  const handlePreviewMedia = useCallback((mediaItem) => {
    if (mediaItem.mimeType.startsWith('image/')) {
      lightbox.onOpen(mediaItem.url);
    }
  }, [lightbox]);

  const handleMoveToFolder = useCallback(async (targetFolder) => {
    try {
      await axiosInstance.post(`${endpoints.cms.media.list}/bulk-move`, {
        mediaIds: selectedMedia,
        folder: targetFolder,
      });

      enqueueSnackbar(`Successfully moved ${selectedMedia.length} file(s)`, {
        variant: 'success',
      });
      setSelectedMedia([]);
      // Trigger SWR revalidation
      invalidateAllMediaLists();
      foldersMutate();
    } catch (error) {
      console.error('Move error:', error);
      enqueueSnackbar('Failed to move files', { variant: 'error' });
      throw error;
    }
  }, [selectedMedia, enqueueSnackbar, invalidateAllMediaLists, foldersMutate]);

  return (
    <>
      <Container maxWidth={settings.themeStretch ? false : 'xl'}>
        <CustomBreadcrumbs
          heading="Media Library"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'CMS', href: paths.dashboard.cms.root },
            { name: 'Media' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={uploadDialog.onTrue}
            >
              Upload Files
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <CMSMediaToolbar
            filters={filters}
            onFilters={handleFilters}
            selectedCount={selectedMedia.length}
            totalCount={media.length}
            onSelectAll={handleSelectAll}
            onDeleteSelected={deleteConfirm.onTrue}
            onMoveSelected={bulkDialog.onTrue}
            currentFolder={filters.folder}
            folders={folders}
          />

          {uploading && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">Uploading files...</Typography>
                  <Typography variant="body2">{Math.round(uploadProgress)}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Stack>
            </Box>
          )}

          <CardContent>
            {mediaLoading ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Loading media...
                </Typography>
              </Box>
            ) : (
              <>
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
                          selected={selectedMedia.includes(item.id)}
                          onSelect={() => handleSelectMedia(item.id)}
                          onDelete={() => handleDeleteSingle(item.id)}
                          onEdit={() => handleEditMedia(item)}
                          onPreview={() => handlePreviewMedia(item)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Upload Dialog */}
      <ConfirmDialog
        open={uploadDialog.value}
        onClose={uploadDialog.onFalse}
        title="Upload Files"
        content={
          <Box sx={{ pt: 2 }}>
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
                placeholder="e.g. crown-line-polo"
                value={newUploadFolder}
                onChange={(e) => setNewUploadFolder(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            <Upload
              multiple
              files={[]}
              onDrop={handleUpload}
              disabled={uploading}
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
                'video/*': ['.mp4', '.webm'],
              }}
            />
          </Box>
        }
        action={
          <Button onClick={uploadDialog.onFalse} variant="outlined">
            Close
          </Button>
        }
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.value}
        onClose={deleteConfirm.onFalse}
        title="Delete Media"
        content={
          <>
            Are you sure you want to delete <strong>{selectedMedia.length}</strong> file(s)? This
            action cannot be undone.
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={handleDeleteSelected}>
            Delete
          </Button>
        }
      />

      {/* Metadata Editor Dialog */}
      <CMSMediaMetadataDialog
        open={metadataDialog.value}
        onClose={metadataDialog.onFalse}
        media={currentMedia}
        onUpdate={handleUpdateMedia}
      />

      {/* Bulk Operations Dialog */}
      <CMSMediaBulkDialog
        open={bulkDialog.value}
        onClose={bulkDialog.onFalse}
        selectedCount={selectedMedia.length}
        folders={folders}
        onMoveToFolder={handleMoveToFolder}
      />

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
