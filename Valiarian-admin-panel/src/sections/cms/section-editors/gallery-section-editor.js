import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
// @mui
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import FormProvider, { RHFSelect, RHFTextField } from 'src/components/hook-form';
//
import CMSMediaPickerField from '../cms-media-picker-field';

// ----------------------------------------------------------------------

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'carousel', label: 'Carousel' },
];

// ----------------------------------------------------------------------

export default function GallerySectionEditor({ section, onSave, onCancel }) {
  const defaultValues = {
    name: section?.name || 'Gallery Section',
    heading: section?.content?.heading || '',
    layout: section?.content?.layout || 'grid',
    columns: section?.content?.columns || 3,
    aspectRatio: section?.content?.aspectRatio || '16:9',
    images: section?.content?.images || [],
  };

  const methods = useForm({ defaultValues });
  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = methods;
  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    await onSave({
      name: data.name,
      type: 'gallery',
      content: {
        heading: data.heading,
        layout: data.layout,
        columns: parseInt(data.columns, 10),
        aspectRatio: data.aspectRatio,
        images: data.images,
      },
      settings: {},
    });
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Stack spacing={2}>
              <RHFTextField name="name" label="Section Name" />
              <RHFTextField name="heading" label="Section Heading" />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Layout</Typography>
            <Stack spacing={2}>
              <RHFSelect name="layout" label="Layout Style">
                {LAYOUT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </RHFSelect>
              {values.layout === 'grid' && (
                <RHFTextField name="columns" label="Columns" type="number" inputProps={{ min: 1, max: 6 }} />
              )}
              <RHFTextField name="aspectRatio" label="Aspect Ratio" helperText="e.g., 16:9, 4:3, 1:1" />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Images</Typography>
            <CMSMediaPickerField
              label="Gallery Images"
              value={values.images}
              onChange={(urls) => setValue('images', urls)}
              multiple
              helperText="Select multiple images from media library"
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
              }}
            />
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {section ? 'Update Section' : 'Create Section'}
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

GallerySectionEditor.propTypes = {
  section: PropTypes.object,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};
