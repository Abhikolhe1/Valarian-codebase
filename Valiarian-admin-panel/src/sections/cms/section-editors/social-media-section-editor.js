import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useBoolean } from 'src/hooks/use-boolean';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';
import Iconify from 'src/components/iconify';
import { MultiFilePreviewSortable } from 'src/components/upload';
import CMSMediaPicker from '../cms-media-picker';

// ----------------------------------------------------------------------

const MAX_GALLERY_IMAGES = 5;
const DEFAULT_GALLERY_IMAGES = [
  '/assets/images/home/social-media/social-1.jpeg',
  '/assets/images/home/social-media/social-2.jpeg',
  '/assets/images/home/social-media/social-3.jpeg',
  '/assets/images/home/social-media/social-4.jpeg',
  '/assets/images/home/social-media/social-5.jpeg',
];

export default function SocialMediaSectionEditor({ section, onSave, onCancel }) {
  const pickerOpen = useBoolean();
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Social Media',
      type: 'social-media',
      content: {
        title: section?.content?.title || '@valiarianpremiumpolos',
        subtitle: section?.content?.subtitle || 'Stay connected with Valiarian',
        instagram: section?.content?.instagram || 'valiarian.wear',
        youtube: section?.content?.youtube || 'valiarianwear',
        galleryImages: section?.content?.galleryImages?.length
          ? section.content.galleryImages.slice(0, MAX_GALLERY_IMAGES)
          : DEFAULT_GALLERY_IMAGES,
      },
      settings: section?.settings || {
        backgroundColor: '#f9fafb',
      },
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const values = watch();
  const galleryImages = values.content?.galleryImages || [];

  const openGalleryPicker = () => {
    if (galleryImages.length >= MAX_GALLERY_IMAGES) {
      return;
    }

    pickerOpen.onTrue();
  };

  const handleSelectGalleryImage = (selectedMedia) => {
    const nextUrl = selectedMedia?.url || '';

    if (!nextUrl) {
      pickerOpen.onFalse();
      return;
    }

    const nextImages = [...galleryImages];

    if (!nextImages.includes(nextUrl)) {
      nextImages.push(nextUrl);
    }

    setValue('content.galleryImages', nextImages.slice(0, MAX_GALLERY_IMAGES));
    pickerOpen.onFalse();
  };

  const removeGalleryImage = (fileToRemove) => {
    setValue(
      'content.galleryImages',
      galleryImages.filter((image) => image !== fileToRemove)
    );
  };

  const reorderGalleryImages = (nextImages) => {
    setValue('content.galleryImages', nextImages.slice(0, MAX_GALLERY_IMAGES));
  };

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      ...data,
      content: {
        ...data.content,
        galleryImages: (data.content?.galleryImages || [])
          .filter(Boolean)
          .slice(0, MAX_GALLERY_IMAGES),
      },
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} py={2}>
        <RHFTextField name="name" label="Section Name" />
        <RHFTextField name="content.title" label="Title" placeholder="@valiarianpremiumpolos" />
        <RHFTextField
          name="content.subtitle"
          label="Subtitle"
          placeholder="Stay connected with Valiarian"
          multiline
          rows={2}
        />

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Social Media Handles
        </Typography>
        <RHFTextField
          name="content.instagram"
          label="Instagram Username"
          placeholder="valiarian.wear"
        />
        <RHFTextField
          name="content.youtube"
          label="YouTube Username"
          placeholder="valiarianwear"
        />

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Social Gallery Images</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="solar:add-circle-bold" />}
                  onClick={openGalleryPicker}
                  disabled={galleryImages.length >= MAX_GALLERY_IMAGES}
                >
                  Add Image
                </Button>
              </Stack>

              <Alert severity="info">
                You can set the exact display order here. Maximum {MAX_GALLERY_IMAGES} images.
              </Alert>

              <Box sx={{ my: 1 }}>
                <MultiFilePreviewSortable
                  files={galleryImages}
                  thumbnail
                  onRemove={removeGalleryImage}
                  onReorder={reorderGalleryImages}
                />
              </Box>

              {galleryImages.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No gallery images added yet.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <RHFTextField
          name="settings.backgroundColor"
          label="Background Color"
          placeholder="#f9fafb"
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Save Section
          </Button>
        </Stack>
      </Stack>

      <CMSMediaPicker
        open={pickerOpen.value}
        onClose={pickerOpen.onFalse}
        onSelect={handleSelectGalleryImage}
        multiple={false}
        selectedMedia={[]}
        accept={{
          'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
        }}
      />
    </FormProvider>
  );
}

SocialMediaSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
