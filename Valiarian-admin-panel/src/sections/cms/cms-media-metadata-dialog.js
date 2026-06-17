import PropTypes from 'prop-types';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
// utils
import axiosInstance, { endpoints } from 'src/utils/axios';
// components
import FormProvider from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function CMSMediaMetadataDialog({ open, onClose, media, onUpdate }) {
  const { enqueueSnackbar } = useSnackbar();

  const defaultValues = {
    altText: media?.altText || '',
    caption: media?.caption || '',
    tags: media?.tags || [],
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (media) {
      reset({
        altText: media.altText || '',
        caption: media.caption || '',
        tags: media.tags || [],
      });
    }
  }, [media, reset]);

  const handleAddTag = useCallback(
    (event) => {
      if (event.key === 'Enter' && event.target.value.trim()) {
        event.preventDefault();
        const newTag = event.target.value.trim();
        if (!values.tags.includes(newTag)) {
          setValue('tags', [...values.tags, newTag]);
        }
        event.target.value = '';
      }
    },
    [values.tags, setValue]
  );

  const handleDeleteTag = useCallback(
    (tagToDelete) => {
      setValue(
        'tags',
        values.tags.filter((tag) => tag !== tagToDelete)
      );
    },
    [values.tags, setValue]
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await axiosInstance.patch(endpoints.cms.media.details(media.id), data);

      enqueueSnackbar('Media metadata updated successfully', { variant: 'success' });
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      enqueueSnackbar('Failed to update media metadata', { variant: 'error' });
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Media Metadata</DialogTitle>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Alt Text */}
            <TextField
              fullWidth
              label="Alt Text"
              placeholder="Describe the image for accessibility"
              {...methods.register('altText')}
              helperText="Used for accessibility and SEO"
            />

            {/* Caption */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Caption"
              placeholder="Add a caption for this media"
              {...methods.register('caption')}
            />

            {/* Tags */}
            <Box>
              <TextField
                fullWidth
                label="Tags"
                placeholder="Type and press Enter to add tags"
                onKeyDown={handleAddTag}
                helperText="Press Enter to add a tag"
              />

              {values.tags.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                  {values.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      size="small"
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Save Changes
          </Button>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

CMSMediaMetadataDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  media: PropTypes.object,
  onUpdate: PropTypes.func,
};
