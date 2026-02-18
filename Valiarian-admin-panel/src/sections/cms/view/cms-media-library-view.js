import { useCallback, useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
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
import CMSMediaFolderDialog from '../cms-media-folder-dialog';
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

  // Use hooks to get media and folders
  const { media: mediaData, mediaLoading, mediaMutate } = useGetMedia(filters);
  const { folders } = useGetMediaFolders();

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
  const folderDialog = useBoolean();
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
        // Trigger SWR revalidation
        mediaMutate();
        uploadDialog.onFalse();
      } catch (error) {
        console.error('Upload error:', error);
        enqueueSnackbar(error?.error?.message || 'Failed to upload files', { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [filters.folder, enqueueSnackbar, uploadDialog, mediaMutate]
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
      mediaMutate();
      deleteConfirm.onFalse();
    } catch (error) {
      console.error('Delete error:', error);
      enqueueSnackbar('Failed to delete media', { variant: 'error' });
    }
  }, [selectedMedia, enqueueSnackbar, deleteConfirm, mediaMutate]);

  const handleDeleteSingle = useCallback(
    async (mediaId) => {
      try {
        await axiosInstance.delete(endpoints.cms.media.details(mediaId));

        enqueueSnackbar('Media deleted successfully', { variant: 'success' });
        // Trigger SWR revalidation
        mediaMutate();
      } catch (error) {
        console.error('Delete error:', error);
        enqueueSnackbar('Failed to delete media', { variant: 'error' });
      }
    },
    [enqueueSnackbar, mediaMutate]
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

  const handleCreateFolder = useCallback(async (folderName) => {
    // For now, folders are created implicitly when uploading to them
    // SWR will automatically revalidate folders when needed
  }, []);

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
      mediaMutate();
    } catch (error) {
      console.error('Move error:', error);
      enqueueSnackbar('Failed to move files', { variant: 'error' });
      throw error;
    }
  }, [selectedMedia, enqueueSnackbar, mediaMutate]);

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
            onCreateFolder={folderDialog.onTrue}
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

      {/* Folder Creation Dialog */}
      <CMSMediaFolderDialog
        open={folderDialog.value}
        onClose={folderDialog.onFalse}
        onCreateFolder={handleCreateFolder}
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
