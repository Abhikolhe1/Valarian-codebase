import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import { RHFTextField } from 'src/components/hook-form';
import FormProvider from 'src/components/hook-form/form-provider';
import CMSMediaPickerField from '../cms-media-picker-field';

// ----------------------------------------------------------------------

export default function CollectionHeroSectionEditor({ section, onSave, onCancel }) {
  const methods = useForm({
    defaultValues: {
      name: section?.name || 'Collection Hero',
      type: 'collection-hero',
      content: {
        title: section?.content?.title || 'New Collection',
        subtitle: section?.content?.subtitle || 'Explore our latest designs',
        backgroundImage:
          section?.content?.backgroundImage ||
          '/assets/images/home/new-arrival/new-arrival-hero.jpeg',
        backgroundVideo: section?.content?.backgroundVideo || '',
        ctaText: section?.content?.ctaText || 'View All',
        ctaLink: section?.content?.ctaLink || '/product',
      },
      settings: section?.settings || {
        backgroundColor: '#000000',
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

  const onSubmit = handleSubmit(async (data) => {
    await onSave(data);
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} py={2}>
        <RHFTextField name="name" label="Section Name" />

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Content
            </Typography>

            <Stack spacing={2}>
              <RHFTextField name="content.title" label="Title" placeholder="New Collection" />
              <RHFTextField
                name="content.subtitle"
                label="Subtitle"
                placeholder="Explore our latest designs"
                multiline
                rows={2}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <RHFTextField name="content.ctaText" label="Button Text" placeholder="View All" />
                <RHFTextField name="content.ctaLink" label="Button Link" placeholder="/product" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Background Media
            </Typography>

            <Stack spacing={2}>
              <CMSMediaPickerField
                label="Background Image"
                value={values.content?.backgroundImage}
                onChange={(url) => setValue('content.backgroundImage', url)}
                helperText="Select a banner image from the media library"
                accept={{
                  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
                }}
              />
              <CMSMediaPickerField
                label="Background Video (Optional)"
                value={values.content?.backgroundVideo}
                onChange={(url) => setValue('content.backgroundVideo', url)}
                helperText="Optional video override for the collection hero"
                accept={{
                  'video/*': ['.mp4', '.webm'],
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        <RHFTextField
          name="settings.backgroundColor"
          label="Background Color"
          placeholder="#000000"
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
    </FormProvider>
  );
}

CollectionHeroSectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
